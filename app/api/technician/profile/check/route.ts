import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile) return NextResponse.json({ isTechnician: false, hasProfile: true })
  if (profile.role !== "technician") return NextResponse.json({ isTechnician: false, hasProfile: true })

  const { data: techProfile } = await supabase.from("technician_profiles").select("id").eq("id", user.id).single()

  return NextResponse.json({ isTechnician: true, hasProfile: !!techProfile })
}
