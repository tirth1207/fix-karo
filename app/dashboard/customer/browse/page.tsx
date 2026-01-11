import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { ServiceDiscovery } from "@/components/service-discovery"

export default async function BrowseServicesPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  console.log(profile)

  // Fetch service categories
  const { data: categories } = await supabase
    .from("service_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order")
  console.log(categories)

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Find Services</h1>
          <p className="text-muted-foreground">Search for services by category or describe your problem</p>
        </div>

        <ServiceDiscovery
          categories={categories || []}
          customerCity={profile?.city || ""}
          customerState={profile?.state || ""}
          customerLatitude={profile?.latitude || "null"}
          customerLongitude={profile?.longitude || "null"}
        />
      </main>
    </div>
  )
}
