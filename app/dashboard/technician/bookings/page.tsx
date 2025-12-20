import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Calendar, MapPin, Clock } from "lucide-react"

export default async function TechnicianBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "technician") {
    redirect("/")
  }

  // Fetch all bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!bookings_customer_id_fkey(full_name, phone, email),
      service:technician_services(service_name, base_price)
    `,
    )
    .eq("technician_id", user.id)
    .order("scheduled_date", { ascending: false })

  const pendingBookings = bookings?.filter((b) => b.status === "pending")
  const confirmedBookings = bookings?.filter((b) => b.status === "confirmed")
  const inProgressBookings = bookings?.filter((b) => b.status === "in_progress")
  const completedBookings = bookings?.filter((b) => b.status === "completed")
  const cancelledBookings = bookings?.filter((b) => b.status === "cancelled")

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  }

  const BookingCard = ({ booking }: { booking: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{booking.service?.service_name}</CardTitle>
            <CardDescription>Customer: {booking.customer?.full_name}</CardDescription>
          </div>
          <Badge className={statusColors[booking.status as keyof typeof statusColors]}>{booking.status}</Badge>
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
              {booking.service_address}, {booking.service_city}
            </span>
          </div>
          {booking.customer_notes && (
            <div className="mt-2 rounded-lg bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Customer notes:</p>
              <p className="text-sm">{booking.customer_notes}</p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-lg font-semibold">${booking.total_amount}</span>
            <Link href={`/dashboard/technician/bookings/${booking.id}`}>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <TechnicianNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground">Manage your appointments and service requests</p>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingBookings?.length || 0})</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed ({confirmedBookings?.length || 0})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressBookings?.length || 0})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedBookings?.length || 0})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelledBookings?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingBookings && pendingBookings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No pending booking requests</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="space-y-4">
              {confirmedBookings && confirmedBookings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {confirmedBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No confirmed bookings</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {inProgressBookings && inProgressBookings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {inProgressBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No jobs in progress</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedBookings && completedBookings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No completed jobs</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledBookings && cancelledBookings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {cancelledBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No cancelled bookings</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
