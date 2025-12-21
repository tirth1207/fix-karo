import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, DollarSign, TrendingUp } from "lucide-react"

export default async function PriceAuditPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard/customer")

  // Get price audit logs
  const { data: auditLogs } = await supabase
    .from("price_audit_logs")
    .select(
      `
      *,
      booking:bookings(
        id,
        customer:profiles!bookings_customer_id_fkey(full_name),
        technician:technician_profiles(
          profile:profiles(full_name)
        )
      ),
      service:services(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100)

  // Get price disputes
  const { data: disputes } = await supabase
    .from("price_disputes")
    .select(
      `
      *,
      customer:profiles!price_disputes_customer_id_fkey(full_name),
      technician:technician_profiles(
        profile:profiles(full_name)
      )
    `,
    )
    .order("created_at", { ascending: false })

  // Get upsell attempts
  const { data: upsells } = await supabase
    .from("upsell_attempts")
    .select(
      `
      *,
      booking:bookings(
        customer:profiles!bookings_customer_id_fkey(full_name),
        technician:technician_profiles(
          profile:profiles(full_name)
        )
      )
    `,
    )
    .eq("admin_reviewed", false)
    .order("created_at", { ascending: false })

  const suspiciousCount = auditLogs?.filter((log) => log.is_suspicious).length || 0
  const openDisputesCount = disputes?.filter((d) => d.status === "open").length || 0
  const pendingUpsellsCount = upsells?.length || 0

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Price Fraud Monitoring</h1>
          <p className="text-muted-foreground mt-1">Track pricing violations, disputes, and upsell attempts</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Suspicious Price Logs</CardDescription>
              <CardTitle className="text-3xl text-red-600">{suspiciousCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Open Price Disputes</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{openDisputesCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Upsell Reviews</CardDescription>
              <CardTitle className="text-3xl">{pendingUpsellsCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Price Disputes */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle>Price Disputes</CardTitle>
            </div>
            <CardDescription>Customer-reported pricing issues requiring review</CardDescription>
          </CardHeader>
          <CardContent>
            {disputes && disputes.length > 0 ? (
              <div className="space-y-3">
                {disputes.map((dispute: any) => (
                  <div key={dispute.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          {dispute.customer?.full_name} vs {dispute.technician?.profile?.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Booking ID: {dispute.booking_id?.slice(0, 8)}...
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          dispute.status === "open"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {dispute.status}
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm mb-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Amount:</span>
                        <span className="font-medium">${dispute.original_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Disputed Amount:</span>
                        <span className="font-medium text-red-600">${dispute.disputed_amount}</span>
                      </div>
                    </div>
                    <p className="text-sm p-2 bg-muted rounded">{dispute.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No price disputes</p>
            )}
          </CardContent>
        </Card>

        {/* Suspicious Audit Logs */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <CardTitle>Suspicious Price Patterns</CardTitle>
            </div>
            <CardDescription>Bookings with significant price deviations from platform rates</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs && auditLogs.filter((log) => log.is_suspicious).length > 0 ? (
              <div className="space-y-3">
                {auditLogs
                  .filter((log) => log.is_suspicious)
                  .slice(0, 10)
                  .map((log: any) => (
                    <div key={log.id} className="p-4 rounded-lg border bg-yellow-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{log.service?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Technician: {log.booking?.technician?.profile?.full_name}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {log.price_variance_percent.toFixed(1)}% variance
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform Price:</span>
                          <span className="font-medium">${log.platform_price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quoted Price:</span>
                          <span className="font-medium">${log.technician_quoted_price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Final Charged:</span>
                          <span className="font-medium text-red-600">${log.final_charged_price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No suspicious pricing patterns detected</p>
            )}
          </CardContent>
        </Card>

        {/* Upsell Attempts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <CardTitle>Upsell Attempts</CardTitle>
            </div>
            <CardDescription>Technician attempts to charge more than original booking amount</CardDescription>
          </CardHeader>
          <CardContent>
            {upsells && upsells.length > 0 ? (
              <div className="space-y-3">
                {upsells.map((upsell: any) => (
                  <div key={upsell.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">Technician: {upsell.booking?.technician?.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Customer: {upsell.booking?.customer?.full_name}</p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pending Review
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm mb-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Amount:</span>
                        <span className="font-medium">${upsell.original_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attempted Amount:</span>
                        <span className="font-medium text-orange-600">${upsell.attempted_amount}</span>
                      </div>
                    </div>
                    {upsell.reason_given && <p className="text-sm p-2 bg-muted rounded">{upsell.reason_given}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No pending upsell attempts</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
