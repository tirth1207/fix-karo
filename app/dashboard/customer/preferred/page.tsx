import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MapPin, Calendar, Shield, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getPreferredTechnicians } from "@/app/actions/rebooking-actions"

export default async function PreferredTechniciansPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "customer") redirect("/")

  const result = await getPreferredTechnicians()
  const preferredTechnicians = result.preferredTechnicians || []

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Preferred Technicians</h1>
          <p className="text-muted-foreground mt-1">
            Rebook with technicians you've worked with before. All bookings go through our platform for protection.
          </p>
        </div>

        {preferredTechnicians.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {preferredTechnicians.map((pref: any) => (
              <Card key={pref.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pref.technician?.profile?.full_name}</CardTitle>
                      <CardDescription>{pref.service?.name}</CardDescription>
                    </div>
                    {pref.offline_contact_suspected && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">
                        {pref.technician?.rating?.toFixed(1) || "New"} ({pref.technician?.total_reviews} reviews)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {pref.technician?.profile?.city}, {pref.technician?.profile?.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {pref.total_bookings} booking{pref.total_bookings !== 1 ? "s" : ""} with this technician
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span className="capitalize">{pref.technician?.verification_status}</span>
                    </div>

                    {pref.last_booking && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-1">Last booking</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pref.last_booking.scheduled_date).toLocaleDateString()} - $
                          {pref.last_booking.total_amount}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {pref.last_booking.status}
                        </Badge>
                      </div>
                    )}

                    {!pref.offline_contact_suspected ? (
                      <Link href={`/dashboard/customer/rebook/${pref.technician?.id}?service=${pref.service_id}`}>
                        <Button className="w-full">Rebook with {pref.technician?.profile?.full_name}</Button>
                      </Link>
                    ) : (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs text-red-700">
                          This technician has been flagged for suspected offline contact. Please contact support.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't completed any bookings yet</p>
              <Link href="/dashboard/customer/browse">
                <Button>Browse Services</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Platform Protection</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>All rebookings go through our platform with escrow protection</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Warranty coverage maintained for platform bookings only</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Offline payments disable warranty and may result in technician suspension</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
