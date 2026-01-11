import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Calendar, MapPin, Clock, Star, ArrowRight, Search } from "lucide-react"

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
  const { data: bookings, error } = await supabase
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

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200 dark:border-yellow-900",
    confirmed: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200 dark:border-blue-900",
    in_progress: "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-200 dark:border-purple-900",
    completed: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 dark:border-green-900",
    cancelled: "bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200 dark:border-red-900",
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.full_name}. Track your service requests here.
          </p>
        </div>
        <Link href="/dashboard/customer/browse">
          <Button size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all">
            Book a Service <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Bookings</h2>
          {bookings && bookings.length > 0 && (
            <Link href="/dashboard/customer/bookings" className="text-sm text-primary hover:underline">
              View history
            </Link>
          )}
        </div>

        {bookings && bookings.length > 0 ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="divide-y">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="group p-5 flex flex-col md:flex-row md:items-center gap-6 hover:bg-muted/50 transition-colors">
                  {/* Time Badge */}
                  <div className="flex md:flex-col items-center gap-2 md:gap-0 justify-center min-w-[80px] text-center">
                    <span className="text-sm font-semibold uppercase text-muted-foreground">
                      {new Date(booking.scheduled_date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold tracking-tighter">
                      {new Date(booking.scheduled_date).getDate()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(booking.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{booking.service?.service_id.name}</h3>
                      <Badge variant="outline" className={statusColors[booking.status as keyof typeof statusColors]}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {booking.service_city}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {booking.technician_id?.rating?.toFixed(1) || "4.5"}
                      </div>
                    </div>
                    <p className="text-sm">
                      Provider: <span className="font-medium text-foreground">{booking.technician_id?.profile?.full_name || "Assigning..."}</span>
                    </p>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto mt-4 md:mt-0">
                    <span className="font-bold text-lg tabular-nums">
                      ${booking.total_amount}
                    </span>
                    <Link href={`/dashboard/customer/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm">Details</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No bookings yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                You haven't booked any services yet. Browse our catalog to find trusted professionals.
              </p>
              <Link href="/dashboard/customer/browse">
                <Button>Browse Services</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
