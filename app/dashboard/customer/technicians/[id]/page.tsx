import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, Clock, Shield, CheckCircle2 } from "lucide-react"
import { BookingForm } from "@/components/booking-form"

export default async function TechnicianProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { id } = await params

  // Fetch technician profile
  const { data: technician } = await supabase
    .from("technician_profiles")
    .select(
      `
      *,
      profile:profiles(full_name, city, state, avatar_url, phone),
      services:technician_services(*)
    `,
    )
    .eq("id", id)
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .single()

  if (!technician) {
    notFound()
  }

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      `
      *,
      customer:profiles!reviews_customer_id_fkey(full_name)
    `,
    )
    .eq("technician_id", id)
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="flex min-h-svh flex-col">
      <CustomerNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Technician info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{technician.profile?.full_name}</CardTitle>
                      <CardDescription className="text-base">{technician.business_name}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <div>
                        <p className="font-semibold">{technician.rating?.toFixed(1) || "New"}</p>
                        <p className="text-sm text-muted-foreground">{technician.total_reviews} reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {technician.profile?.city}, {technician.profile?.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Experience</p>
                        <p className="text-sm text-muted-foreground">{technician.years_of_experience || 0}+ years</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">Jobs completed</p>
                        <p className="text-sm text-muted-foreground">{technician.total_jobs_completed}</p>
                      </div>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div className="mt-6">
                    <h3 className="mb-2 font-semibold">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {technician.specializations?.map((spec: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Verification badges */}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {technician.background_check_completed && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Background checked
                      </Badge>
                    )}
                    {technician.license_number && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Licensed
                      </Badge>
                    )}
                    {technician.insurance_policy_number && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Insured
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle>Reviews ({technician.total_reviews})</CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{review.customer?.full_name || "Customer"}</p>
                              <div className="flex">
                                {Array.from({ length: review.rating }).map((_, i) => (
                                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {review.review_text && <p className="text-sm text-muted-foreground">{review.review_text}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No reviews yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Booking form */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Book a service</CardTitle>
                  <CardDescription>Select a service and schedule your appointment</CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingForm technicianId={technician.id} services={technician.services || []} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
