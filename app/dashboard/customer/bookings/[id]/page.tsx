import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { CustomerNav } from "@/components/customer-nav"
import { RazorpayPaymentButton } from "@/components/razorpay-payment-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    const { id } = await params

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: booking } = await supabase
        .from("bookings")
        .select(
            `
      *,
      technician_id:technician_profiles(
        *,
        profile:profiles!technician_profiles_id_fkey(id, full_name, role)
      ),
      service:technician_services(service_id:services(name, description), custom_price)
    `
        )
        .eq("id", id)
        .single()

    if (!booking) {
        notFound()
    }

    // Security check
    if (booking.customer_id !== user.id) {
        redirect("/dashboard/customer")
    }

    // Fetch payment status if exists
    const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", booking.id)
        .single()

    console.log(payment, error)

    const isPaid = payment?.payment_status === "held_in_escrow" || payment?.payment_status === "released"
    const canPay = !isPaid && booking.status !== "cancelled"
    // && booking.status === 'pending_payment' ? 
    // Note: If booking is 'pending' and we want them to pay, we allow it.

    return (
        <div className="flex min-h-svh flex-col">
            <CustomerNav />

            <main className="flex-1 bg-muted/50">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-6">
                        <Link href="/dashboard/customer" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to bookings
                        </Link>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold">Booking Details</h1>
                                <p className="text-muted-foreground">Booking ID: {booking.id}</p>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Service Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold">{booking.service?.service_id.name}</span>
                                        <div className="flex gap-2">
                                            <Badge variant={isPaid ? "default" : "secondary"}>
                                                {isPaid ? "Payment Done" : "Payment Pending"}
                                            </Badge>
                                            <Badge variant="outline">{booking.status}</Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{booking.service?.service_id.description}</p>

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
                                            {booking.service_address}, {booking.service_city}, {booking.service_state} {booking.service_zip_code}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {booking.technician_id && (
                                <Card>
                                    <CardHeader><CardTitle>Technician</CardTitle></CardHeader>
                                    <CardContent>
                                        <p>{booking.technician_id.profile.full_name}</p>
                                        {/* Add more tech info if needed */}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment</CardTitle>
                                    <CardDescription>
                                        {isPaid ? "Payment has been secured in escrow." : "Please complete payment to confirm your booking."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Service Total</span>
                                        <span className="font-semibold">${booking.total_amount}</span>
                                    </div>
                                    {/* Add fee breakdown if available */}

                                    <div className="border-t pt-4">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total</span>
                                            <span>₹{booking.total_amount}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    {isPaid ? (
                                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Paid & Secured
                                        </Button>
                                    ) : canPay ? (
                                        <RazorpayPaymentButton
                                            bookingId={booking.id}
                                            amount={booking.total_amount}
                                        />
                                    ) : (
                                        <Button className="w-full" disabled variant="secondary">
                                            {booking.status === 'cancelled' ? 'Booking Cancelled' : 'Payment Unavailable'}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>

                            {isPaid && (
                                <div className="rounded-lg border bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-semibold">Your payment is safe</span>
                                    </div>
                                    <p className="mt-1 text-sm">Funds are held in escrow and only released to the technician after the job is completed and approved.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
