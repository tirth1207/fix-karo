import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { TechnicianServiceForm } from "@/components/technician-service-form"

export default async function AddTechnicianServicePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "technician") redirect("/dashboard/customer")

  // Require onboarding completion
  const { data: techProfile } = await supabase.from("technician_profiles").select("id").eq("id", user.id).single()
  if (!techProfile) redirect("/dashboard/technician/onboarding")

  // Get all platform services that technician hasn't added yet
  const { data: myServiceIds } = await supabase
    .from("technician_services")
    .select("service_id")
    .eq("technician_id", user.id)

  const myIds = myServiceIds?.map((s) => s.service_id) || []

  const { data: availableServices } = await supabase
    .from("services")
    .select(
      `
      *,
      category:service_categories(name, icon_name)
    `,
    )
    .eq("is_active", true)
    .order("name")

  // Filter out services already added
  const services = availableServices?.filter((s) => !myIds.includes(s.id)) || []

  return (
    <div className="min-h-screen bg-background">
      <TechnicianNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Add Service to Your Offerings</h1>
        <TechnicianServiceForm services={services} />
      </main>
    </div>
  )
}
