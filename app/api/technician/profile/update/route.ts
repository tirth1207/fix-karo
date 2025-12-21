import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    const {
      id,
      business_name,
      specializations,
      years_of_experience,
      license_number,
      insurance_policy_number,
      // profile fields
      full_name,
      city,
      state,
      zip_code,
      phone,
    } = body

    // Only allow updating own profile unless user is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const targetId = id && profile.role === "admin" ? id : user.id

    const updatePayload: any = {}
    if (typeof business_name !== "undefined") updatePayload.business_name = business_name
    if (typeof specializations !== "undefined") updatePayload.specializations = specializations
    if (typeof years_of_experience !== "undefined") updatePayload.years_of_experience = years_of_experience
    if (typeof license_number !== "undefined") updatePayload.license_number = license_number
    if (typeof insurance_policy_number !== "undefined") updatePayload.insurance_policy_number = insurance_policy_number

    // Update technician_profiles if any technician-specific fields provided
    let updated: any = null
    let error: any = null

    if (Object.keys(updatePayload).length > 0) {
      const res = await supabase.from("technician_profiles").update(updatePayload).eq("id", targetId).select().single()
      updated = res.data
      error = res.error
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    // Update profiles table for contact/location fields
    const profileUpdate: any = {}
    if (typeof full_name !== "undefined") profileUpdate.full_name = full_name
    if (typeof city !== "undefined") profileUpdate.city = city
    if (typeof state !== "undefined") profileUpdate.state = state
    if (typeof zip_code !== "undefined") profileUpdate.zip_code = zip_code
    if (typeof phone !== "undefined") profileUpdate.phone = phone

    if (Object.keys(profileUpdate).length > 0) {
      const res2 = await supabase.from("profiles").update(profileUpdate).eq("id", targetId).select().single()
      if (res2.error) {
        return NextResponse.json({ error: res2.error.message }, { status: 400 })
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Return the latest technician row with joined profile for convenience
    const { data: refreshed, error: fetchError } = await supabase
      .from("technician_profiles")
      .select(`*, profile:profiles!technician_profiles_id_fkey(full_name, email, phone, city, state)`)
      .eq("id", targetId)
      .single()

    if (fetchError) {
      return NextResponse.json({ success: true, profile: updated })
    }

    return NextResponse.json({ success: true, profile: refreshed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
