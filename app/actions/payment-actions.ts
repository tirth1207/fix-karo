"use server"

import { createClient } from "@/lib/supabase/server"
import { calculatePaymentBreakdown } from "@/lib/payment-utils"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function createPaymentRecord(
  bookingId: string,
  customerId: string,
  technicianId: string,
  amount: number,
  idempotencyKey?: string,
) {
  const supabase = await createClient()

  try {
    // Generate idempotency key if not provided
    const idemKey = idempotencyKey || crypto.randomUUID()

    // Check if payment already exists with this idempotency key
    const { data: existing } = await supabase.from("payments").select("*").eq("idempotency_key", idemKey).single()

    if (existing) {
      console.log("[v0] Payment already exists for idempotency key:", idemKey)
      return { success: true, payment: existing, alreadyExists: true }
    }

    const breakdown = calculatePaymentBreakdown(amount)

    // Create payment
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        booking_id: bookingId,
        customer_id: customerId,
        technician_id: technicianId,
        amount: breakdown.amount,
        platform_fee: breakdown.platformFee,
        technician_payout: breakdown.technicianPayout,
        payment_status: "pending",
        idempotency_key: idemKey,
        // Auto-release after 7 days if not disputed
        auto_release_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Create payment event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      event_type: "created",
      idempotency_key: `${idemKey}_created`,
      amount: breakdown.amount,
      metadata: { breakdown },
    })

    return { success: true, payment, alreadyExists: false }
  } catch (error: any) {
    console.log("[v0] Payment creation error:", error)
    console.error("[v0] Payment creation error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function holdPaymentInEscrow(paymentId: string, idempotencyKey?: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const idemKey = idempotencyKey || `hold_${paymentId}_${Date.now()}`

    // Check if already held
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("*")
      .eq("idempotency_key", idemKey)
      .single()

    if (existingEvent) {
      return { success: true, alreadyHeld: true }
    }

    const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single()

    if (!payment) throw new Error("Payment not found")

    // Update payment status
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "held_in_escrow",
        held_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    if (error) throw error

    // Create payment event
    await supabase.from("payment_events").insert({
      payment_id: paymentId,
      event_type: "held_in_escrow",
      idempotency_key: idemKey,
      amount: payment.amount,
    })

    revalidatePath("/admin/payments")
    return { success: true, alreadyHeld: false }
  } catch (error: any) {
    console.error("[v0] Escrow hold error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function releasePaymentToTechnician(paymentId: string, idempotencyKey?: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Verify admin role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required")
    }

    const idemKey = idempotencyKey || `release_${paymentId}_${Date.now()}`

    // Check if already released
    const { data: existingEvent } = await supabase
      .from("payment_events")
      .select("*")
      .eq("idempotency_key", idemKey)
      .single()

    if (existingEvent) {
      return { success: true, alreadyReleased: true }
    }

    // Get payment details
    const { data: payment } = await supabase.from("payments").select("*, booking_id").eq("id", paymentId).single()

    if (!payment) throw new Error("Payment not found")

    // Verify booking is completed
    const { data: booking } = await supabase.from("bookings").select("status").eq("id", payment.booking_id).single()

    if (booking?.status !== "completed") {
      throw new Error("Cannot release payment: booking not completed")
    }

    // Release payment
    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    if (error) throw error

    // Create payment event
    await supabase.from("payment_events").insert({
      payment_id: paymentId,
      event_type: "released",
      idempotency_key: idemKey,
      amount: payment.technician_payout,
    })

    // Log ops event
    await supabase.from("ops_events").insert({
      event_type: "payment_released",
      entity_type: "payment",
      entity_id: paymentId,
      action_taken: "funds_transferred_to_technician",
      reason: "job_completed_and_verified",
      metadata: { technician_id: payment.technician_id, amount: payment.technician_payout },
    })

    revalidatePath("/admin/payments")
    revalidatePath("/dashboard/technician")
    return { success: true, alreadyReleased: false }
  } catch (error: any) {
    console.error("[v0] Payment release error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function refundPayment(paymentId: string, reason: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Verify admin role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required")
    }

    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq("id", paymentId)

    if (error) throw error

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "payment_refunded",
      resource_type: "payment",
      resource_id: paymentId,
      metadata: { reason },
    })

    revalidatePath("/admin/payments")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Payment refund error:", error.message)
    return { success: false, error: error.message }
  }
}
