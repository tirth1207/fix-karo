import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react"

export default async function PaymentsManagementPage() {
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

  // Fetch all payments
  const { data: payments } = await supabase
    .from("payments")
    .select(
      `
      *,
      booking:bookings(
        *,
        service:technician_services(service_name)
      ),
      customer:profiles!payments_customer_id_fkey(full_name),
      technician:technician_profiles(profile:profiles(full_name))
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50)

  const totalProcessed = payments?.reduce((sum, p) => sum + Number.parseFloat(p.amount || "0"), 0).toFixed(2) || "0.00"

  const platformFees =
    payments?.reduce((sum, p) => sum + Number.parseFloat(p.platform_fee || "0"), 0).toFixed(2) || "0.00"

  const escrowBalance = payments
    ?.filter((p) => p.payment_status === "held_in_escrow")
    .reduce((sum, p) => sum + Number.parseFloat(p.amount || "0"), 0)
    .toFixed(2)

  const releasedPayments = payments?.filter((p) => p.payment_status === "released").length || 0

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    held_in_escrow: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    released: "bg-green-500/10 text-green-700 dark:text-green-400",
    refunded: "bg-red-500/10 text-red-700 dark:text-red-400",
  }

  return (
    <div className="flex min-h-svh flex-col">
      <AdminNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Monitor escrow and payment releases</p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalProcessed}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${platformFees}</div>
                <p className="text-xs text-muted-foreground">Revenue generated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Escrow</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${escrowBalance}</div>
                <p className="text-xs text-muted-foreground">Pending job completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Released</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{releasedPayments}</div>
                <p className="text-xs text-muted-foreground">Paid to technicians</p>
              </CardContent>
            </Card>
          </div>

          {/* Payments list */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <p className="font-medium">{payment.booking?.service?.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.customer?.full_name} → {payment.technician?.profile?.full_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${payment.amount}</p>
                        <p className="text-xs text-muted-foreground">
                          Fee: ${payment.platform_fee} | Payout: ${payment.technician_payout}
                        </p>
                        <Badge className={`mt-2 ${statusColors[payment.payment_status as keyof typeof statusColors]}`}>
                          {payment.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No payment records</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
