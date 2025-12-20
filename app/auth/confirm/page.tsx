import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ConfirmPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to determine role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  // Redirect based on role
  if (profile?.role === "admin") {
    redirect("/admin")
  } else if (profile?.role === "technician") {
    redirect("/dashboard/technician")
  } else {
    redirect("/dashboard/customer")
  }
}
