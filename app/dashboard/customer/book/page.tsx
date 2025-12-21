import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { SmartBookingForm } from "@/components/smart-booking-form"

export default async function BookServicePage({ searchParams }: { searchParams: { service?: string } }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  let selectedService = null
  if (searchParams.service) {
    const { data } = await supabase
      .from("technician_services")
      .select(
        `
        *,
        service:services(*),
        technician:technician_profiles(
          profile:profiles(full_name, city, state)
        )
      `,
      )
      .eq("id", searchParams.service)
      .single()

    selectedService = data
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Book Service</h1>
        <SmartBookingForm customerProfile={profile} preselectedService={selectedService} />
      </main>
    </div>
  )
}
