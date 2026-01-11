import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Clock, Shield, CheckCircle2, ChevronRight, Info } from "lucide-react"
import { DedicatedBookingForm } from "@/components/dedicated-booking-form"
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

  // Fetch technician service details
  const { data: techService, error: serviceError } = await supabase
    .from("technician_services")
    .select(`
      *,
      service:services (
        id,
        name,
        description,
        estimated_duration_minutes,
        category:service_categories (name)
      ),
      technician:technician_profiles (
        id,
        business_name,
        rating,
        total_reviews,
        verification_status,
        profile:profiles!technician_profiles_id_fkey (
          full_name,
          city,
          state
        )
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
    .select("city, state, zip_code, address")
    .eq("id", user.id)
    .single()

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      {/* <CustomerNav /> */}

      <main className="flex-1 pb-12">
        {/* Breadcrumbs */}
        <div className="bg-background border-b mb-8">
          <div className="container mx-auto px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/customer/browse" className="hover:text-primary transition-colors">Browse</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/dashboard/customer/technicians/${techService.technician_id}`} className="hover:text-primary transition-colors">
              {techService.technician?.profile?.full_name}'s Profile
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Checkout</span>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 tracking-tight">Complete Your Booking</h1>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column: Summary and Details */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Service Summary</CardTitle>
                    <CardDescription>Confirm the service details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{techService.service?.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{techService.service?.category?.name}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-primary/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Technician</span>
                        <span className="font-medium">{techService.technician?.profile?.full_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Base Price</span>
                        <span className="font-bold text-lg">${techService.custom_price}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {techService.service?.estimated_duration_minutes} mins
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Quality Assurance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <p className="text-sm">Verified professional with {techService.technician?.rating || 0}/5 rating</p>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <p className="text-sm">Escrow payment protection - pay only when job is done</p>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <p className="text-sm">30-day service warranty included</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10 flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-normal">
                    You won't be charged yet. Your professional will review the details and confirm the appointment time.
                  </p>
                </div>
              </div>

              {/* Right Column: Booking Form */}
              <div className="lg:col-span-2">
                <Card className="border-none shadow-2xl">
                  <CardHeader className="pb-8 border-b">
                    <CardTitle className="text-2xl">Service Details</CardTitle>
                    <CardDescription>Tell us where and when you need the service</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <DedicatedBookingForm
                      technicianId={techService.technician_id}
                      serviceId={techService.id}
                      totalAmount={techService.custom_price}
                      initialData={{
                        city: customerProfile?.city,
                        state: customerProfile?.state,
                        zipCode: customerProfile?.zip_code,
                        address: customerProfile?.address
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
