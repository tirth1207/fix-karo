import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { createTechnicianProfile } from "@/lib/technician-profile"
import { TechnicianOnboardingForm } from "@/components/technician-onboarding-form"

export default async function TechnicianOnboardingPage() {
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

  // We render a client-side form component to submit to an API route and then navigate client-side.
  // This avoids server-action redirect exceptions (NEXT_REDIRECT) surfacing as 500 in dev.
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-3xl font-bold mb-6">Complete your technician profile</h1>
        <p className="mb-4 text-sm text-muted-foreground">This information is required to access the technician dashboard.</p>

        {/* Client-side onboarding form handles submission and redirects on success */}
        {/* @ts-ignore */}
        <TechnicianOnboardingForm fullName={profile?.full_name} />
      </main>
    </div>
  )
}
