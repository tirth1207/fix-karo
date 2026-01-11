import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Clock, Shield, CheckCircle2, ChevronRight, Info } from "lucide-react"
import { SmartBookingForm } from "@/components/smart-booking-form"
import Link from "next/link"

interface BookPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { service: serviceId } = await searchParams
  if (!serviceId || typeof serviceId !== "string") {
    notFound()
  }

  // Fetch technician service details (used as a template/placeholder for the booking)
  // We need this to get the underlying 'service' details and a valid ID for the foreign key.
  const { data: techService, error: serviceError } = await supabase
    .from("technician_services")
    .select(`
      *,
      service:services (
        id,
        name,
        description,
        base_price,
        estimated_duration_minutes,
        category:service_categories (name)
      ),
      technician:technician_profiles (
         id,
         profile:profiles!technician_profiles_verified_by_fkey(full_name)
      )
    `)
    .eq("id", serviceId)
    .single()

  if (serviceError || !techService) {
    console.error("Failed to fetch service details:", serviceError)
    notFound()
  }

  // Fetch customer profile for pre-filling
  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("city, state, zip_code, address, latitude, longitude")
    .eq("id", user.id)
    .single()

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <main className="flex-1 pb-12">
        {/* Breadcrumbs */}
        <div className="bg-background border-b mb-8">
          <div className="container mx-auto px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/customer/browse" className="hover:text-primary transition-colors">Browse</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Checkout</span>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 tracking-tight">Complete Your Request</h1>

            <div className="grid gap-8">
              {/* Replaced DedicatedBookingForm with SmartBookingForm and removed direct Technician info */}
              <SmartBookingForm
                customerProfile={customerProfile}
                preselectedService={techService}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
