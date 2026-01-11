import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Technician ID missing" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 })
    }

    const body = await req.json()
    const {
      verification_status,
      verification_notes,
      is_active,
      suspension_reason,
    } = body

    const updatePayload: Record<string, any> = {}

    if (verification_status !== undefined)
      updatePayload.verification_status = verification_status

    if (verification_notes !== undefined)
      updatePayload.verification_notes = verification_notes

    if (is_active !== undefined)
      updatePayload.is_active = is_active

    if (suspension_reason !== undefined)
      updatePayload.suspension_reason = suspension_reason

    // Audit logic
    if (verification_status === "verified") {
      updatePayload.verified_by = user.id
      updatePayload.verified_at = new Date().toISOString()
    }

    if (is_active === false) {
      updatePayload.suspended_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from("technician_profiles")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: refreshed, error: fetchError } = await supabase
      .from("technician_profiles")
      .select(`
        *,
        profile:profiles!technician_profiles_id_fkey(
          full_name, email, phone, city, state, zip_code
        ),
        verified_by_profile:profiles!technician_profiles_verified_by_fkey(
          id, full_name, email
        )
      `)
      .eq("id", id)
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
