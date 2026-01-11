import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
} from "lucide-react"

export default async function TechnicianDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "technician") {
    redirect("/")
  }

  // Fetch technician profile
  const { data: techProfile,error } = await supabase.from("technician_profiles").select("*").eq("id", user.id).single()
  if (error) {
    console.error("Failed to fetch technician_profiles:", error)
  }
  // If user is a technician but has not completed onboarding, force completion
  if (!techProfile) {
    redirect("/dashboard/technician/onboarding")
  }

  // Fetch bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!bookings_customer_id_fkey(full_name),
      service:technician_services(service_name, base_price)
    `,
    )
    .eq("technician_id", user.id)
    .order("scheduled_date", { ascending: true })

  // Calculate stats
  const pendingBookings = bookings?.filter((b) => b.status === "pending").length || 0
  const confirmedBookings = bookings?.filter((b) => b.status === "confirmed").length || 0
  const completedBookings = bookings?.filter((b) => b.status === "completed").length || 0

  const totalEarnings =
    bookings
      ?.filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + Number.parseFloat(b.total_amount || "0"), 0) || 0

  // Fetch fraud metrics for this technician
  const { data: fraudMetrics } = await supabase
    .from("fraud_metrics")
    .select("*")
    .eq("user_id", user.id)
    .eq("threshold_exceeded", true)
    .order("detected_at", { ascending: false })
    .limit(5)

  // Fetch active fraud alerts
  const { data: fraudAlerts } = await supabase
    .from("fraud_alerts")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["open", "investigating"])
    .order("created_at", { ascending: false })

  const upcomingBookings = bookings?.filter((b) => b.status === "confirmed" && new Date(b.scheduled_date) > new Date())

  return (
    <div className="flex min-h-svh flex-col">
      <TechnicianNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          {/* Header with verification status */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}</h1>
                <p className="text-muted-foreground">Manage your services and bookings</p>
              </div>
              <div className="flex items-center gap-2">
                {techProfile?.verification_status === "verified" && (
                  <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {techProfile?.verification_status === "pending" && (
                  <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-700">
                    <Clock className="h-3 w-3" />
                    Pending verification
                  </Badge>
                )}
                {techProfile?.verification_status === "suspended" && (
                  <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-700">
                    <XCircle className="h-3 w-3" />
                    Suspended
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Fraud alerts */}
          {fraudAlerts && fraudAlerts.length > 0 && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Active Fraud Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fraudAlerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-start justify-between rounded-lg border bg-card p-3">
                      <div className="flex-1">
                        <p className="font-medium">{alert.alert_type}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <Badge variant="outline" className="mt-2">
                          {alert.severity}
                        </Badge>
                      </div>
                      <Badge variant={alert.status === "open" ? "destructive" : "secondary"} className="bg-transparent">
                        {alert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingBookings}</div>
                <p className="text-xs text-muted-foreground">Awaiting your response</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Confirmed Jobs</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{confirmedBookings}</div>
                <p className="text-xs text-muted-foreground">Scheduled appointments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From {completedBookings} completed jobs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Your Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{techProfile?.rating?.toFixed(1) || "N/A"}</div>
                <p className="text-xs text-muted-foreground">{techProfile?.total_reviews || 0} reviews</p>
              </CardContent>
            </Card>
          </div>

          {/* Anti-fraud metrics */}
          {fraudMetrics && fraudMetrics.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Performance Monitoring</CardTitle>
                </div>
                <CardDescription>Recent activity metrics that exceeded normal thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fraudMetrics.map((metric: any) => (
                    <div key={metric.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{metric.metric_type.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">
                          Detected on {new Date(metric.detected_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{metric.metric_value}</p>
                        {metric.threshold_exceeded && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                            Above threshold
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Your next scheduled jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings && upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 5).map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <p className="font-medium">{booking.service?.service_name}</p>
                        <p className="text-sm text-muted-foreground">with {booking.customer?.full_name}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                          <span>{new Date(booking.scheduled_date).toLocaleTimeString()}</span>
                          <span>
                            {booking.service_city}, {booking.service_state}
                          </span>
                        </div>
                      </div>
                      <Link href={`/dashboard/technician/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm">
                          View details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No upcoming appointments</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
