import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, User, Briefcase } from "lucide-react"
import { PaymentActionsAdmin } from "@/components/payment-actions-admin"

export default async function PaymentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  // Fetch payment details
  const { data: payment } = await supabase
    .from("payments")
    .select(
      `
      *,
      booking:bookings(
        *,
        service:technician_services(service_name, description)
      ),
      customer:profiles!payments_customer_id_fkey(full_name, email, phone),
      technician:technician_profiles(
        *,
        profile:profiles(full_name, email, phone)
      )
    `,
    )
    .eq("id", id)
    .single()

  if (!payment) {
    notFound()
  }

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
            <h1 className="text-3xl font-bold">Payment Details</h1>
            <p className="text-muted-foreground">Manage escrow and payment release</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Payment details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">Payment #{payment.id.slice(0, 8)}</CardTitle>
                      <CardDescription>{payment.booking?.service?.service_name}</CardDescription>
                    </div>
                    <Badge className={statusColors[payment.payment_status as keyof typeof statusColors]}>
                      {payment.payment_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Payment Breakdown</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service amount</span>
                            <span className="font-medium">${payment.amount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (15%)</span>
                            <span className="font-medium">-${payment.platform_fee}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span className="font-semibold">Technician payout</span>
                            <span className="text-lg font-bold">${payment.technician_payout}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Timeline</p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>Created: {new Date(payment.created_at).toLocaleString()}</p>
                          {payment.held_at && <p>Held in escrow: {new Date(payment.held_at).toLocaleString()}</p>}
                          {payment.released_at && <p>Released: {new Date(payment.released_at).toLocaleString()}</p>}
                          {payment.refunded_at && <p>Refunded: {new Date(payment.refunded_at).toLocaleString()}</p>}
                        </div>
                      </div>
                    </div>

                    {payment.refund_reason && (
                      <div className="rounded-lg border bg-destructive/10 p-4">
                        <p className="mb-1 font-medium text-destructive">Refund Reason</p>
                        <p className="text-sm">{payment.refund_reason}</p>
                      </div>
                    )}

                    {payment.razorpay_order_id && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Razorpay Order ID</p>
                            <p className="font-mono text-sm">{payment.razorpay_order_id}</p>
                          </div>
                          {payment.razorpay_payment_id && (
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Razorpay Payment ID</p>
                              <p className="font-mono text-sm">{payment.razorpay_payment_id}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Booking details */}
              <Card>
                <CardHeader>
                  <CardTitle>Related Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium">{payment.booking?.service?.service_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="bg-transparent">
                        {payment.booking?.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span className="font-medium">
                        {new Date(payment.booking?.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">
                        {payment.booking?.service_city}, {payment.booking?.service_state}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Parties & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{payment.customer?.full_name}</p>
                    <p className="text-muted-foreground">{payment.customer?.email}</p>
                    {payment.customer?.phone && <p className="text-muted-foreground">{payment.customer.phone}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Technician
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{payment.technician?.profile?.full_name}</p>
                    <p className="text-muted-foreground">{payment.technician?.business_name}</p>
                    <p className="text-muted-foreground">{payment.technician?.profile?.email}</p>
                    {payment.technician?.profile?.phone && (
                      <p className="text-muted-foreground">{payment.technician.profile.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentActionsAdmin paymentId={payment.id} currentStatus={payment.payment_status} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
