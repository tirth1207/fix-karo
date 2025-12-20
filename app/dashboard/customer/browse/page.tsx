import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Star, MapPin, Clock, Shield } from "lucide-react"

export default async function BrowseServicesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch service categories
  const { data: categories } = await supabase.from("service_categories").select("*").eq("is_active", true)

  // Fetch verified technicians with their services
  const { data: technicians } = await supabase
    .from("technician_profiles")
    .select(
      `
      *,
      profile:profiles(full_name, city, state, avatar_url),
      services:technician_services(*)
    `,
    )
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .limit(20)

  return (
    <div className="flex min-h-svh flex-col">
      <CustomerNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Browse Services</h1>
            <p className="text-muted-foreground">Find verified technicians for your home service needs</p>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories?.map((category: any) => (
                <Badge key={category.id} variant="secondary" className="cursor-pointer px-4 py-2">
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Technicians */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Verified Technicians</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {technicians?.map((technician: any) => (
                <Card key={technician.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{technician.profile?.full_name}</CardTitle>
                        <CardDescription>{technician.business_name}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700">
                        <Shield className="h-3 w-3" />
                        Verified
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {technician.rating?.toFixed(1) || "New"} ({technician.total_reviews} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {technician.profile?.city}, {technician.profile?.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{technician.years_of_experience || 0}+ years experience</span>
                      </div>

                      {/* Specializations */}
                      <div className="flex flex-wrap gap-1">
                        {technician.specializations?.slice(0, 3).map((spec: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>

                      {/* Services */}
                      {technician.services && technician.services.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="mb-2 text-sm font-medium">Services offered</p>
                          <div className="space-y-2">
                            {technician.services.slice(0, 2).map((service: any) => (
                              <div key={service.id} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{service.service_name}</span>
                                <span className="font-medium">${service.base_price}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link href={`/dashboard/customer/technicians/${technician.id}`}>
                        <Button className="w-full">View profile & book</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
