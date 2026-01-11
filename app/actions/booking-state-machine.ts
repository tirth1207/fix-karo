"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function transitionBookingStatus(
  bookingId: string,
  nextState: string,
  metadata?: {
    notes?: string
    cancellationReason?: string
    otpCode?: string
    deviceId?: string
    ipAddress?: string
  },
) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Get current booking state
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*, technician_id, customer_id")
      .eq("id", bookingId)
      .single()

    if (fetchError || !booking) throw new Error("Booking not found")

    // Verify user authorization
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isCustomer = booking.customer_id === user.id
    const isTechnician = booking.technician_id === user.id
    const isAdmin = profile?.role === "admin"

    if (!isCustomer && !isTechnician && !isAdmin) {
      throw new Error("Unauthorized to modify this booking")
    }

    // State-specific logic and validation
    const updateData: any = {
      status: nextState,
      updated_at: new Date().toISOString(),
    }

    switch (nextState) {
      case "pending_payment":
        // Only customers can move to payment
        if (!isCustomer) throw new Error("Only customers can initiate payment")
        break

      case "confirmed":
        // Only technicians can confirm (after payment)
        if (!isTechnician) throw new Error("Only technicians can confirm bookings")
        break

      case "technician_en_route": {
        if (!isTechnician) throw new Error("Unauthorized")
        if (!metadata?.otpCode) throw new Error("OTP code is required to start the job")
        const otpValid = await verifyOTP(bookingId, user.id, metadata.otpCode, "job_start")
        if (!otpValid) throw new Error("Invalid OTP code")
        break
      }

      case "in_progress":
        // Only technicians
        if (!isTechnician) throw new Error("Unauthorized")
        updateData.actual_start_time = new Date().toISOString()
        break

      case "awaiting_customer_confirmation": {
        if (!isTechnician) throw new Error("Unauthorized")
        if (!metadata?.otpCode) throw new Error("OTP code is required to complete the job")
        const otpValid = await verifyOTP(bookingId, user.id, metadata.otpCode, "job_completion")
        if (!otpValid) throw new Error("Invalid OTP code for completion")
        updateData.actual_end_time = new Date().toISOString()
        break
      }

      case "completed":
        // Customer or admin can approve completion
        // Database trigger will validate photos and GPS
        if (!isCustomer && !isAdmin) throw new Error("Unauthorized")
        updateData.actual_end_time = updateData.actual_end_time || new Date().toISOString()
        break

      case "disputed":
        // Customer or admin
        if (!isCustomer && !isAdmin) throw new Error("Unauthorized")
        break

      case "cancelled":
        updateData.cancelled_by = user.id
        updateData.cancelled_at = new Date().toISOString()
        if (metadata?.cancellationReason) {
          updateData.cancellation_reason = metadata.cancellationReason
        }
        break

      default:
        throw new Error(`Invalid booking status: ${nextState}`)
    }

    if (metadata?.notes) {
      updateData.technician_notes = metadata.notes
    }

    // Update booking - DB trigger will validate transition
    const { error: updateError } = await supabase.from("bookings").update(updateData).eq("id", bookingId)

    if (updateError) {
      // DB will reject invalid transitions
      throw new Error(updateError.message)
    }

    // Log device and IP if provided
    if (metadata?.deviceId || metadata?.ipAddress) {
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: `booking_transition_to_${nextState}`,
        entity_type: "booking",
        entity_id: bookingId,
        device_id: metadata.deviceId,
        ip_address: metadata.ipAddress,
        metadata: {
          previous_status: booking.status,
          new_status: nextState,
        },
      })
    }

    revalidatePath("/dashboard/customer")
    revalidatePath("/dashboard/technician")
    revalidatePath("/admin")

    return { success: true, booking: { ...booking, status: nextState } }
  } catch (error: any) {
    console.error("[v0] Booking transition error:", error.message)
    return { success: false, error: error.message }
  }
}

async function verifyOTP(
  bookingId: string,
  userId: string,
  otpCode: string,
  otpType: "job_start" | "job_completion",
): Promise<boolean> {
  const supabase = await createClient()

  const { data: otp } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .eq("otp_type", otpType)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!otp || otp.otp_code !== otpCode) {
    // Increment attempts
    if (otp) {
      const newAttempts = otp.attempts + 1
      await supabase
        .from("otp_verifications")
        .update({ attempts: newAttempts })
        .eq("id", otp.id)

      if (newAttempts >= 3) {
        // Log potential abuse
        console.warn(`[OTP Abuse] User ${userId} exceeded attempts for booking ${bookingId}`)
      }
    }
    return false
  }

  // Check if max attempts reached
  if (otp.attempts >= 3) {
    return false
  }

  // Mark as verified
  await supabase
    .from("otp_verifications")
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq("id", otp.id)

  return true
}

export async function generateOTP(bookingId: string, otpType: "job_start" | "job_completion") {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Check for resend cooldown (30s)
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("booking_id", bookingId)
      .eq("otp_type", otpType)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (recentOtp) {
      const lastSent = new Date(recentOtp.created_at).getTime()
      const now = Date.now()
      if (now - lastSent < 30 * 1000) {
        throw new Error("Please wait 30 seconds before requesting a new OTP")
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const { error } = await supabase.from("otp_verifications").insert({
      user_id: user.id,
      booking_id: bookingId,
      otp_code: otpCode,
      otp_type: otpType,
      expires_at: expiresAt.toISOString(),
    })

    if (error) throw error

    // In production, send via SMS/email
    console.log(`[SMS Gateway Placeholder] Sending OTP ${otpCode} to user ${user.id} for booking ${bookingId}`)

    // For security, do not return the OTP code to the client
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
