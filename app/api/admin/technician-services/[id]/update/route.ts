import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: "Service ID missing" }, { status: 400 })
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
    const { action, rejection_reason } = body
    /**
     * action = "approve" | "reject"
     */

    const updatePayload: Record<string, any> = {}

    if (action === "approve") {
      updatePayload.approval_status = "approved"
      updatePayload.is_active = true
      updatePayload.approved_by = user.id
      updatePayload.approved_at = new Date().toISOString()
      updatePayload.rejection_reason = null
    }

    if (action === "reject") {
      updatePayload.approval_status = "rejected"
      updatePayload.is_active = false
      updatePayload.rejection_reason = rejection_reason || "Rejected by admin"
      updatePayload.approved_by = user.id
      updatePayload.approved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from("technician_services")
      .update(updatePayload)
      .eq("id", id)

    if (error) {
      console.error("Service approval error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    )
  }
}
