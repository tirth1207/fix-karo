"use server"

import { createClient } from "@/lib/supabase/server"
import { calculatePaymentBreakdown } from "@/lib/payment-utils"
import { revalidatePath } from "next/cache"

export async function createPaymentRecord(bookingId: string, customerId: string, technicianId: string, amount: number) {
  const supabase = await createClient()

  try {
    const breakdown = calculatePaymentBreakdown(amount)

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
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: customerId,
      action: "payment_created",
      resource_type: "payment",
      resource_id: payment.id,
      metadata: { booking_id: bookingId, amount: breakdown.amount },
    })

    return { success: true, payment }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function holdPaymentInEscrow(paymentId: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { error } = await supabase
      .from("payments")
      .update({
        payment_status: "held_in_escrow",
        held_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    if (error) throw error

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "payment_held_in_escrow",
      resource_type: "payment",
      resource_id: paymentId,
    })

    revalidatePath("/admin/payments")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function releasePaymentToTechnician(paymentId: string) {
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

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "payment_released",
      resource_type: "payment",
      resource_id: paymentId,
      metadata: { technician_id: payment.technician_id, amount: payment.technician_payout },
    })

    revalidatePath("/admin/payments")
    revalidatePath("/dashboard/technician")
    return { success: true }
  } catch (error: any) {
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
    return { success: false, error: error.message }
  }
}
