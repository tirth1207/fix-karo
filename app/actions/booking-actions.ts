"use server"

import { createClient } from "@/lib/supabase/server"
import { createPaymentRecord, holdPaymentInEscrow } from "./payment-actions"
import { revalidatePath } from "next/cache"

export async function confirmBookingWithPayment(bookingId: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Get booking details
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, technician_id, customer_id, total_amount")
      .eq("id", bookingId)
      .single()

    if (!booking) throw new Error("Booking not found")

    // Verify user is the technician accepting the booking
    if (booking.technician_id !== user.id) {
      throw new Error("Unauthorized")
    }

    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", bookingId)

    if (bookingError) throw bookingError

    // Create payment record
    const paymentResult = await createPaymentRecord(
      bookingId,
      booking.customer_id,
      booking.technician_id,
      booking.total_amount,
    )

    if (!paymentResult.success || !paymentResult.payment) {
      throw new Error(paymentResult.error || "Failed to create payment")
    }

    // Hold payment in escrow
    await holdPaymentInEscrow(paymentResult.payment.id)

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "booking_confirmed",
      resource_type: "booking",
      resource_id: bookingId,
    })

    revalidatePath("/dashboard/technician")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function completeBookingAndReleasePayment(bookingId: string, technicianNotes?: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Get booking details
    const { data: booking } = await supabase.from("bookings").select("technician_id").eq("id", bookingId).single()

    if (!booking) throw new Error("Booking not found")

    // Verify user is the technician
    if (booking.technician_id !== user.id) {
      throw new Error("Unauthorized")
    }

    // Update booking to completed
    const updateData: any = {
      status: "completed",
      actual_end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (technicianNotes) {
      updateData.technician_notes = technicianNotes
    }

    const { error: bookingError } = await supabase.from("bookings").update(updateData).eq("id", bookingId)

    if (bookingError) throw bookingError

    // Update technician's completed jobs count
    const { error: techError } = await supabase.rpc("increment_completed_jobs" as any, {
      technician_id: user.id,
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "booking_completed",
      resource_type: "booking",
      resource_id: bookingId,
    })

    revalidatePath("/dashboard/technician")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
