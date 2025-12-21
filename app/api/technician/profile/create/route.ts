import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createTechnicianProfile } from "@/lib/technician-profile"

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    const { business_name, specializations, years_of_experience, license_number, insurance_policy_number } = body

    // Ensure the profile role is technician
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || profile.role !== "technician") {
      return NextResponse.json({ error: "Technician role required" }, { status: 403 })
    }

    try {
      const inserted = await createTechnicianProfile({
        id: user.id,
        business_name: business_name || null,
        specializations: specializations || [],
        years_of_experience: typeof years_of_experience === "number" ? years_of_experience : null,
        license_number: license_number || null,
        insurance_policy_number: insurance_policy_number || null,
      })

      return NextResponse.json({ success: true, profile: inserted })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create profile"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
