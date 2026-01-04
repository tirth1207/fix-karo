import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianOnboardingFormV2 } from "@/components/TechnicianOnboardingFormV2"

/**
 * Enhanced Technician Onboarding Page (V2)
 * Includes automatic geocoding synchronization upon profile completion.
 */
export default async function TechnicianOnboardingPageV2() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (profile?.role !== "technician") redirect("/dashboard/customer")

  // If technician profile already exists, go to dashboard
  const { data: techProfile } = await supabase.from("technician_profiles").select("id").eq("id", user.id).single()
  if (techProfile) redirect("/dashboard/technician")

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-3xl font-bold mb-6">Complete your technician profile (V2)</h1>
        <p className="mb-4 text-sm text-muted-foreground">This version automatically synchronizes your coordinates for service discovery.</p>

        <TechnicianOnboardingFormV2 fullName={profile?.full_name} />
      </main>
    </div>
  )
}
