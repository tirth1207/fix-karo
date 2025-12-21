"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createService(data: any) {
  const supabase = await createServerClient()

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  // Validate price bounds
  const minPrice = Number.parseFloat(data.min_price)
  const maxPrice = Number.parseFloat(data.max_price)
  const basePrice = Number.parseFloat(data.base_price)

  if (minPrice > maxPrice) {
    return { error: "Min price cannot be greater than max price" }
  }

  if (basePrice < minPrice || basePrice > maxPrice) {
    return { error: "Base price must be within min/max range" }
  }

  const { error } = await supabase.from("services").insert({
    category_id: data.category_id,
    name: data.name,
    description: data.description,
    base_price: basePrice,
    min_price: minPrice,
    max_price: maxPrice,
    estimated_duration_minutes: Number.parseInt(data.estimated_duration_minutes),
    warranty_days: Number.parseInt(data.warranty_days),
    emergency_supported: data.emergency_supported,
    is_active: data.is_active,
  })

  if (error) return { error: error.message }

  revalidatePath("/admin/services")
  return { success: true }
}

export async function toggleServiceStatus(serviceId: string, isActive: boolean) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", serviceId)

  if (error) return { error: error.message }

  revalidatePath("/admin/services")
  return { success: true }
}
