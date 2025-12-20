import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, AlertTriangle, TrendingUp, Calendar } from "lucide-react"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  // Fetch platform stats
  const { count: totalTechnicians } = await supabase
    .from("technician_profiles")
    .select("*", { count: "exact", head: true })

  const { count: verifiedTechnicians } = await supabase
    .from("technician_profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "verified")

  const { count: pendingVerification } = await supabase
    .from("technician_profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "pending")

  const { count: totalBookings } = await supabase.from("bookings").select("*", { count: "exact", head: true })

  const { count: activeBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .in("status", ["confirmed", "in_progress"])

  const { count: completedBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, platform_fee")
    .eq("payment_status", "released")

  const totalRevenue = payments?.reduce((sum, p) => sum + Number.parseFloat(p.amount || "0"), 0).toFixed(2) || "0.00"

  const platformFees =
    payments?.reduce((sum, p) => sum + Number.parseFloat(p.platform_fee || "0"), 0).toFixed(2) || "0.00"

  // Fraud monitoring stats
  const { count: activeFraudAlerts } = await supabase
    .from("fraud_alerts")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "investigating"])

  const { count: criticalAlerts } = await supabase
    .from("fraud_alerts")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .in("status", ["open", "investigating"])

  const { count: suspendedTechnicians } = await supabase
    .from("technician_profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "suspended")

  // Recent fraud alerts
  const { data: recentAlerts } = await supabase
    .from("fraud_alerts")
    .select(
      `
      *,
      user:profiles(full_name, email, role)
    `,
    )
    .in("status", ["open", "investigating"])
    .order("created_at", { ascending: false })
    .limit(5)

  // Recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!bookings_customer_id_fkey(full_name),
      technician:technician_profiles(profile:profiles(full_name)),
      service:technician_services(service_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="flex min-h-svh flex-col">
      <AdminNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Platform Overview</h1>
            <p className="text-muted-foreground">Monitor and manage your home services marketplace</p>
          </div>

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTechnicians}</div>
                <p className="text-xs text-muted-foreground">
                  {verifiedTechnicians} verified, {pendingVerification} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {activeBookings} active, {completedBookings} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${platformFees}</div>
                <p className="text-xs text-muted-foreground">${totalRevenue} total processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeFraudAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  {criticalAlerts} critical, {suspendedTechnicians} suspended
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent fraud alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Active Fraud Alerts
                </CardTitle>
                <CardDescription>Recent suspicious activity requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAlerts && recentAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {recentAlerts.map((alert: any) => (
                      <div key={alert.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{alert.alert_type}</p>
                            <p className="text-sm text-muted-foreground">{alert.user?.full_name}</p>
                            <p className="mt-1 text-sm">{alert.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${
                                alert.severity === "critical"
                                  ? "bg-red-500/10 text-red-700"
                                  : alert.severity === "high"
                                    ? "bg-orange-500/10 text-orange-700"
                                    : "bg-yellow-500/10 text-yellow-700"
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-xs text-muted-foreground">{alert.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">No active fraud alerts</p>
                )}
              </CardContent>
            </Card>

            {/* Recent bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Bookings
                </CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookings && recentBookings.length > 0 ? (
                  <div className="space-y-3">
                    {recentBookings.map((booking: any) => (
                      <div key={booking.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{booking.service?.service_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.customer?.full_name} → {booking.technician?.profile?.full_name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(booking.scheduled_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold">${booking.total_amount}</span>
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${
                                booking.status === "completed"
                                  ? "bg-green-500/10 text-green-700"
                                  : booking.status === "confirmed"
                                    ? "bg-blue-500/10 text-blue-700"
                                    : "bg-yellow-500/10 text-yellow-700"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">No recent bookings</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
