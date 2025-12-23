"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createRazorpayOrder } from "@/app/actions/razorpay-actions"
import Script from "next/script"
import { Loader2, CreditCard, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

declare global {
    interface Window {
        Razorpay: any
    }
}

export function RazorpayPaymentButton({
    bookingId,
    amount,
    disabled = false,
}: {
    bookingId: string
    amount: number
    disabled?: boolean
}) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handlePayment = async (method?: string) => {
        setIsLoading(true)

        try {
            // 1. Create Order
            const result = await createRazorpayOrder(bookingId)

            if (!result.success || !result.orderId) {
                throw new Error(result.error || "Failed to create order")
            }

            // 2. Initialize Razorpay
            const options: any = {
                key: result.key, // Enter the Key ID generated from the Dashboard
                amount: result.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                currency: result.currency,
                name: "FixKaro Home Services",
                description: "Service Booking Payment",
                // image: "https://example.com/your_logo",
                order_id: result.orderId, // This is a sample Order ID. Pass the `id` obtained in the response of Step 1
                handler: function (response: any) {
                    // Optimistic update or wait for webhook
                    // We can verify signature here too for faster UX, but backend webhook is source of truth
                    toast.success("Payment Successful! Verifying...")
                    // Add delay to allow webhook to process (race condition fix)
                    setTimeout(() => {
                        router.refresh()
                    }, 3000)
                },
                prefill: {
                    //   name: "Gaurav Kumar",
                    //   email: "gaurav.kumar@example.com",
                    //   contact: "9000090000",
                    method: method // 'upi' will force UPI view
                },
                notes: {
                    address: "Razorpay Corporate Office",
                },
                theme: {
                    color: "#3399cc",
                },
                modal: {
                    ondismiss: function () {
                        setIsLoading(false)
                    }
                }
            }

            const rzp1 = new window.Razorpay(options)
            rzp1.on("payment.failed", function (response: any) {
                toast.error(`Payment Failed: ${response.error.description}`)
                setIsLoading(false)
            })

            rzp1.open()
        } catch (error: any) {
            toast.error(error.message)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
            />
            <Button onClick={() => handlePayment()} disabled={disabled || isLoading} className="w-full">
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay with Card / Netbanking
                    </>
                )}
            </Button>
            <Button onClick={() => handlePayment('upi')} disabled={disabled || isLoading} variant="outline" className="w-full">
                <Smartphone className="mr-2 h-4 w-4" />
                Pay with UPI / QR
            </Button>
        </div>
    )
}
