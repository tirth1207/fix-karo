import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, Mail, Phone, AlertTriangle } from "lucide-react"
import { BookingActions } from "@/components/booking-actions"
import { JobPhotoUpload } from "@/components/job-photo-upload"

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify role and onboarding completion
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "technician") redirect("/")

  const { data: techProfile } = await supabase.from("technician_profiles").select("id").eq("id", user.id).single()
  if (!techProfile) redirect("/dashboard/technician/onboarding")

  const { id } = await params

  // Fetch booking details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!bookings_customer_id_fkey(full_name, phone, email, city, state),
      service:technician_services(service_id:services(name, base_price, description, estimated_duration_minutes), custom_price)
    `,
    )
    .eq("id", id)
    .eq("technician_id", user.id)
    .single()
  if (error) {
    console.error("Failed to fetch booking details:", error)
  }
  console.log(booking)
  if (!booking) {
    console.error("Booking not found or access denied")
  }

  // Fetch payment info
  const { data: payment } = await supabase.from("payments").select("*").eq("booking_id", id).single()

  // Fetch fraud metrics for the customer
  const { data: customerFraudMetrics } = await supabase
    .from("fraud_metrics")
    .select("*")
    .eq("user_id", booking.customer_id)
    .eq("threshold_exceeded", true)
    .order("detected_at", { ascending: false })
    .limit(3)

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* <TechnicianNav /> */}

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Booking Details</h1>
            <p className="text-muted-foreground">Manage this appointment</p>
          </div>

          {/* Fraud warning */}
          {customerFraudMetrics && customerFraudMetrics.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Customer Risk Alert</CardTitle>
                </div>
                <CardDescription>
                  This customer has unusual activity patterns. Proceed with caution and document everything.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customerFraudMetrics.map((metric: any) => (
                    <div key={metric.id} className="text-sm">
                      <span className="font-medium">{metric.metric_type.replace(/_/g, " ")}:</span>{" "}
                      <span className="text-muted-foreground">{metric.metric_value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{booking.service?.service_name}</CardTitle>
                      <CardDescription>Booking #{booking.id.slice(0, 8)}</CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Date</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.scheduled_date).toLocaleTimeString()} (
                          {booking.service?.estimated_duration_minutes || booking.estimated_duration_minutes} mins)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Service Location</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.service_address}
                          <br />
                          {booking.service_city}, {booking.service_state} {booking.service_zip_code}
                        </p>
                      </div>
                    </div>

                    {booking.customer_notes && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="mb-1 font-medium">Customer Notes</p>
                        <p className="text-sm text-muted-foreground">{booking.customer_notes}</p>
                      </div>
                    )}

                    {booking.technician_notes && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="mb-1 font-medium">Your Notes</p>
                        <p className="text-sm text-muted-foreground">{booking.technician_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment info */}
              {payment && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service fee</span>
                        <span className="font-medium">${payment.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform fee</span>
                        <span className="font-medium">-${payment.platform_fee}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Your payout</span>
                        <span className="text-lg font-bold">${payment.technician_payout}</span>
                      </div>
                      <div className="mt-4">
                        <Badge
                          variant={payment.payment_status === "released" ? "default" : "secondary"}
                          className="bg-transparent"
                        >
                          {payment.payment_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Customer info & actions */}
            <div className="space-y-6">
              <JobPhotoUpload bookingId={booking.id} technicianId={user.id} />

              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">{booking.customer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.customer?.city}, {booking.customer?.state}
                      </p>
                    </div>

                    {booking.customer?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" />
                        <a href={`tel:${booking.customer.phone}`} className="text-primary hover:underline">
                          {booking.customer.phone}
                        </a>
                      </div>
                    )}

                    {booking.customer?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-primary" />
                        <a href={`mailto:${booking.customer.email}`} className="text-primary hover:underline">
                          {booking.customer.email}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingActions bookingId={booking.id} currentStatus={booking.status} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
