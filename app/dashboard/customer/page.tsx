import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Calendar, MapPin, Clock, Star } from "lucide-react"

export default async function CustomerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "customer") {
    redirect("/")
  }

  // Fetch customer bookings
  const { data: bookings,error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      technician_id:technician_profiles(
        *,
        profile:profiles!technician_profiles_id_fkey(id, full_name)
      ),
      service:technician_services(service_id:services(name), custom_price)
    `,
    )
    .eq("customer_id", user.id)
    .order("scheduled_date", { ascending: false })
    .limit(10)
  if (error) {
    console.error("Failed to fetch bookings:", error)
  }
  console.log(bookings)
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  }

  return (
    <div className="flex min-h-svh flex-col">
      <CustomerNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}</h1>
              <p className="text-muted-foreground">Manage your service bookings</p>
            </div>
            <Link href="/dashboard/customer/browse">
              <Button size="lg">Book a service</Button>
            </Link>
          </div>

          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your bookings</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {bookings.map((booking: any) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{booking.service?.service_id.name}</CardTitle>
                          <CardDescription>
                            with {booking.technician_id?.profile?.full_name || "Technician"}
                          </CardDescription>
                        </div>
                        <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                          {booking.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(booking.scheduled_date).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {booking.service_city}, {booking.service_state}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {booking.technician_id?.rating?.toFixed(1) || "N/A"} ({booking.technician_id?.total_reviews || 0}{" "}
                            reviews)
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                          <span className="text-lg font-semibold">${booking.total_amount}</span>
                          <Link href={`/dashboard/customer/bookings/${booking.id}`}>
                            <Button variant="outline" size="sm">
                              View details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No bookings yet</CardTitle>
                <CardDescription>Start by browsing available services</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/customer/browse">
                  <Button>Browse services</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
