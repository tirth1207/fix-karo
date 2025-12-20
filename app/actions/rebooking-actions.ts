"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function rebookWithTechnician(
  previousBookingId: string,
  newDate: string,
  newTime: string,
  address: string,
  city: string,
  state: string,
  zipCode: string,
  notes?: string,
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get previous booking details
  const { data: prevBooking, error: prevError } = await supabase
    .from("bookings")
    .select(
      `
      *,
      technician_service:technician_services(
        id,
        service_id,
        custom_price,
        technician_id
      )
    `,
    )
    .eq("id", previousBookingId)
    .single()

  if (prevError || !prevBooking) return { error: "Previous booking not found" }
  if (prevBooking.customer_id !== user.id) return { error: "Unauthorized" }

  // Check if technician is still active and verified
  const { data: techProfile } = await supabase
    .from("technician_profiles")
    .select("verification_status, is_active")
    .eq("id", prevBooking.technician_id)
    .single()

  if (!techProfile || techProfile.verification_status !== "verified" || !techProfile.is_active) {
    return { error: "Technician is no longer available" }
  }

  // Check if technician service is still active
  const { data: techService } = await supabase
    .from("technician_services")
    .select("*")
    .eq("id", prevBooking.technician_service?.id)
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .single()

  if (!techService) {
    return { error: "Service is no longer offered by this technician" }
  }

  // Combine date and time
  const [hours, minutes] = newTime.split(":")
  const scheduledDate = new Date(newDate)
  scheduledDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))

  // Create new booking (still goes through platform pricing & escrow)
  const { data: newBooking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      customer_id: user.id,
      technician_id: prevBooking.technician_id,
      service_id: techService.id,
      scheduled_date: scheduledDate.toISOString(),
      estimated_duration_minutes: prevBooking.estimated_duration_minutes,
      service_address: address,
      service_city: city,
      service_state: state,
      service_zip_code: zipCode,
      customer_notes: notes || null,
      total_amount: techService.custom_price, // current platform price
      status: "pending",
    })
    .select()
    .single()

  if (bookingError) return { error: bookingError.message }

  // Log assignment (customer selected)
  await supabase.from("assignment_logs").insert({
    booking_id: newBooking.id,
    assigned_technician_id: prevBooking.technician_id,
    assignment_type: "customer_selected",
    ranking_factors: { rebook: true, previous_booking_id: previousBookingId },
    reason: "Customer rebooked with preferred technician",
    assigned_by: user.id,
  })

  revalidatePath("/dashboard/customer")
  return { success: true, bookingId: newBooking.id }
}

export async function getPreferredTechnicians(customerId?: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const targetCustomerId = customerId || user.id

  const { data, error } = await supabase
    .from("preferred_technicians")
    .select(
      `
      *,
      technician:technician_profiles(
        id,
        rating,
        total_reviews,
        total_jobs_completed,
        verification_status,
        is_active,
        profile:profiles(full_name, city, state)
      ),
      service:services(
        id,
        name,
        description,
        category:service_categories(name)
      ),
      last_booking:bookings(
        id,
        scheduled_date,
        status,
        total_amount
      )
    `,
    )
    .eq("customer_id", targetCustomerId)
    .order("total_bookings", { ascending: false })

  if (error) return { error: error.message }

  // Filter out suspended/inactive technicians
  const activeTechnicians = data?.filter(
    (pt) => pt.technician?.verification_status === "verified" && pt.technician?.is_active === true,
  )

  return { preferredTechnicians: activeTechnicians }
}

export async function reportOfflineLeakage(technicianId: string, serviceId: string, evidence: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Check if they have history with this technician
  const { data: relationship } = await supabase
    .from("preferred_technicians")
    .select("*")
    .eq("customer_id", user.id)
    .eq("technician_id", technicianId)
    .eq("service_id", serviceId)
    .single()

  if (!relationship) {
    return { error: "No relationship found with this technician" }
  }

  // Mark as suspected offline contact
  await supabase
    .from("preferred_technicians")
    .update({
      offline_contact_suspected: true,
      updated_at: new Date().toISOString(),
    })
    .eq("customer_id", user.id)
    .eq("technician_id", technicianId)
    .eq("service_id", serviceId)

  // Create offline payment report
  const { error } = await supabase.from("offline_payment_reports").insert({
    customer_id: user.id,
    technician_id: technicianId,
    reported_by: user.id,
    report_type: "customer_report",
    description: evidence,
    status: "investigating",
  })

  if (error) return { error: error.message }

  // Create fraud alert
  await supabase.from("fraud_alerts").insert({
    user_id: technicianId,
    alert_type: "offline_leakage_suspected",
    severity: "high",
    description: `Customer reported suspected offline payment arrangement with technician`,
    status: "open",
  })

  revalidatePath("/dashboard/customer")
  return { success: true }
}
