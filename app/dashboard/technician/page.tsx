import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
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
  ArrowRight,
  MoreHorizontal
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
  const { data: techProfile, error } = await supabase.from("technician_profiles").select("*").eq("id", user.id).single()
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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.full_name}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {techProfile?.verification_status === "verified" && (
            <Badge variant="outline" className="h-8 gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400">
              <Shield className="h-3.5 w-3.5" />
              Verified Pro
            </Badge>
          )}
          {techProfile?.verification_status === "pending" && (
            <Badge variant="outline" className="h-8 gap-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Pending Verification
            </Badge>
          )}
          {techProfile?.verification_status === "suspended" && (
            <Badge variant="destructive" className="h-8 gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Account Suspended
            </Badge>
          )}
          <Button size="sm" className="hidden md:flex">
            Export Report
          </Button>
        </div>
      </div>

      {/* Fraud Alerts Banner */}
      {fraudAlerts && fraudAlerts.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-destructive">Action Required: potential security alerts detected</h3>
              <div className="mt-2 space-y-2">
                {fraudAlerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <span className="text-destructive-foreground/80">{alert.description}</span>
                    <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <Button size="sm" variant="destructive">Resolve Issues</Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingBookings?.length || 0} scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires your attention
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{techProfile?.rating?.toFixed(1) || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {techProfile?.total_reviews || 0} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Upcoming Appointments</h2>
            <Link href="/dashboard/technician/bookings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              {upcomingBookings && upcomingBookings.length > 0 ? (
                <div className="divide-y">
                  {upcomingBookings.slice(0, 5).map((booking: any) => (
                    <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border bg-background text-xs font-medium">
                          <span className="uppercase text-muted-foreground">
                            {new Date(booking.scheduled_date).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(booking.scheduled_date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{booking.service?.service_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.customer?.full_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(booking.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/technician/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          Details <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p>No upcoming appointments found.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Monitoring / Side Panel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Performance</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Metrics
              </CardTitle>
              <CardDescription>Recent anomalies detected</CardDescription>
            </CardHeader>
            <CardContent>
              {fraudMetrics && fraudMetrics.length > 0 ? (
                <div className="space-y-4">
                  {fraudMetrics.map((metric: any) => (
                    <div key={metric.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium capitalize">{metric.metric_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(metric.detected_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {metric.metric_value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No issues detected. Good job!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
