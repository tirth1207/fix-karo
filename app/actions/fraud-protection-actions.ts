"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function fileDisputePriceDispute(bookingId: string, disputedAmount: number, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, technician_id, total_amount")
    .eq("id", bookingId)
    .single()

  if (!booking) return { error: "Booking not found" }
  if (booking.customer_id !== user.id) return { error: "Unauthorized" }

  const { error } = await supabase.from("price_disputes").insert({
    booking_id: bookingId,
    customer_id: booking.customer_id,
    technician_id: booking.technician_id,
    original_amount: booking.total_amount,
    disputed_amount: disputedAmount,
    reason,
    status: "open",
  })

  if (error) return { error: error.message }

  revalidatePath("/dashboard/customer")
  return { success: true }
}

export async function reportOfflinePayment(
  technicianId: string,
  description: string,
  bookingId?: string,
  amountIfKnown?: number,
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase.from("offline_payment_reports").insert({
    customer_id: user.id,
    technician_id: technicianId,
    booking_id: bookingId || null,
    reported_by: user.id,
    report_type: "customer_report",
    description,
    amount_if_known: amountIfKnown || null,
    status: "investigating",
  })

  if (error) return { error: error.message }

  // Create immediate fraud alert
  await supabase.from("fraud_alerts").insert({
    user_id: technicianId,
    alert_type: "offline_payment_reported",
    severity: "high",
    description: `Customer reported offline payment attempt: ${description}`,
    status: "open",
  })

  revalidatePath("/dashboard/customer")
  return { success: true }
}

export async function logUpsellAttempt(bookingId: string, attemptedAmount: number, reasonGiven: string) {
  const supabase = await createServerClient()

  // Get booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("total_amount, customer_id")
    .eq("id", bookingId)
    .single()

  if (!booking) return { error: "Booking not found" }

  const { error } = await supabase.from("upsell_attempts").insert({
    booking_id: bookingId,
    original_amount: booking.total_amount,
    attempted_amount: attemptedAmount,
    reason_given: reasonGiven,
    customer_approved: false,
    admin_reviewed: false,
  })

  if (error) return { error: error.message }

  return { success: true }
}

export async function getPriceAuditLogs(filters?: { suspicious?: boolean; technicianId?: string }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  let query = supabase
    .from("price_audit_logs")
    .select(
      `
      *,
      booking:bookings(
        id,
        service_address,
        customer:profiles!bookings_customer_id_fkey(full_name),
        technician:technician_profiles(
          profile:profiles(full_name)
        )
      ),
      service:services(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (filters?.suspicious) {
    query = query.eq("is_suspicious", true)
  }

  if (filters?.technicianId) {
    query = query.eq("booking.technician_id", filters.technicianId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  return { logs: data }
}

export async function reviewPriceDispute(
  disputeId: string,
  resolution: "refund" | "no_refund" | "fraudulent",
  notes: string,
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  const statusMap = {
    refund: "resolved_refund",
    no_refund: "resolved_no_refund",
    fraudulent: "fraudulent",
  }

  const { error } = await supabase
    .from("price_disputes")
    .update({
      status: statusMap[resolution],
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", disputeId)

  if (error) return { error: error.message }

  revalidatePath("/admin/fraud")
  return { success: true }
}
