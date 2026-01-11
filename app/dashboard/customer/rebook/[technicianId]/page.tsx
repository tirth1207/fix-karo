import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { RebookingForm } from "@/components/rebooking-form"

export default async function RebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ technicianId: string }>
  searchParams: Promise<{ service?: string }>
}) {
  const { technicianId } = await params
  const { service } = await searchParams
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Get technician details
  const { data: technician } = await supabase
    .from("technician_profiles")
    .select(
      `
      *,
      profile:profiles(full_name, city, state)
    `,
    )
    .eq("id", technicianId)
    .single()

  if (!technician || technician.verification_status !== "verified") {
    redirect("/dashboard/customer/preferred")
  }

  // Get previous bookings with this technician
  const { data: previousBookings } = await supabase
    .from("bookings")
    .select(
      `
      *,
      technician_service:technician_services(
        id,
        service:services(name, estimated_duration_minutes),
        custom_price
      )
    `,
    )
    .eq("customer_id", user.id)
    .eq("technician_id", technicianId)
    .order("scheduled_date", { ascending: false })
    .limit(1)

  const previousBooking = previousBookings?.[0]

  return (
    <div className="min-h-screen bg-background">
      {/* <CustomerNav /> */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Rebook Service</h1>
        <p className="text-muted-foreground mb-8">Book another appointment with {technician.profile?.full_name}</p>
        <RebookingForm
          technician={technician}
          customerProfile={profile}
          previousBooking={previousBooking}
          serviceId={service}
        />
      </main>
    </div>
  )
}
