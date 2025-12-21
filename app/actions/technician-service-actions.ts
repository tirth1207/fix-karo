"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addTechnicianService(data: any) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "technician") {
    return { error: "Technician access required" }
  }

  // Check if technician profile exists and verification state
  const { data: techProfile } = await supabase
    .from("technician_profiles")
    .select("verification_status")
    .eq("id", user.id)
    .single()

  // If profile is missing, require onboarding first
  if (!techProfile) {
    return { error: "Please complete your technician profile onboarding before adding services." }
  }

  if (techProfile?.verification_status === "suspended") {
    return { error: "Your account is suspended. Cannot add services." }
  }

  // Get service to validate price bounds
  const { data: service } = await supabase
    .from("services")
    .select("min_price, max_price")
    .eq("id", data.service_id)
    .single()

  if (!service) {
    return { error: "Service not found" }
  }

  const customPrice = Number.parseFloat(data.custom_price)
  if (customPrice < service.min_price || customPrice > service.max_price) {
    return { error: `Price must be between $${service.min_price} and $${service.max_price}` }
  }

  // Insert technician service (will be pending approval)
  const { error } = await supabase.from("technician_services").insert({
    technician_id: user.id,
    service_id: data.service_id,
    custom_price: customPrice,
    coverage_radius_km: Number.parseInt(data.coverage_radius_km),
    experience_level: data.experience_level,
    tools_declared: data.tools_declared || [],
    is_active: false,
    approval_status: "pending",
  })

  if (error) return { error: error.message }

  revalidatePath("/dashboard/technician/services")
  return { success: true }
}

export async function updateTechnicianService(serviceId: string, data: any) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Verify ownership
  const { data: techService } = await supabase
    .from("technician_services")
    .select("technician_id, service_id")
    .eq("id", serviceId)
    .single()

  if (techService?.technician_id !== user.id) {
    return { error: "Unauthorized" }
  }

  // Get service to validate price bounds
  const { data: service } = await supabase
    .from("services")
    .select("min_price, max_price")
    .eq("id", techService.service_id)
    .single()

  if (!service) {
    return { error: "Service not found" }
  }

  const customPrice = Number.parseFloat(data.custom_price)
  if (customPrice < service.min_price || customPrice > service.max_price) {
    return { error: `Price must be between $${service.min_price} and $${service.max_price}` }
  }

  const { error } = await supabase
    .from("technician_services")
    .update({
      custom_price: customPrice,
      coverage_radius_km: Number.parseInt(data.coverage_radius_km),
      experience_level: data.experience_level,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/technician/services")
  return { success: true }
}

export async function approveTechnicianService(serviceId: string, approved: boolean, rejectionReason?: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  const updateData: any = {
    approval_status: approved ? "approved" : "rejected",
    updated_at: new Date().toISOString(),
  }

  if (approved) {
    updateData.is_active = true
    updateData.approved_at = new Date().toISOString()
    updateData.approved_by = user.id
  } else {
    updateData.rejection_reason = rejectionReason
  }

  const { error } = await supabase.from("technician_services").update(updateData).eq("id", serviceId)

  if (error) return { error: error.message }

  revalidatePath("/admin/technicians")
  return { success: true }
}
