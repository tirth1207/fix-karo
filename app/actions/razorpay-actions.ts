"use server"

import { createClient } from "@/lib/supabase/server"
import { razorpay } from "@/lib/razorpay"
import { calculatePaymentBreakdown } from "@/lib/payment-utils"
import crypto from "crypto"

export async function createRazorpayOrder(bookingId: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    try {
        // 1. Get booking details
        const { data: booking, error: fetchError } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single()

        if (fetchError || !booking) {
            console.error("Booking fetch error:", fetchError)
            throw new Error("Booking not found")
        }

        if (booking.customer_id !== user.id) {
            throw new Error("Unauthorized")
        }

        // 2. Calculate amount (ensure consistency)
        // Assuming booking has a total_amount
        const amount = booking.total_amount || 0

        if (amount <= 0) {
            throw new Error("Invalid booking amount")
        }

        const receiptId = `rcpt_${bookingId.substring(0, 8)}_${Date.now()}`

        // 3. Create Razorpay Order
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Razorpay expects paisa
            currency: "INR",
            receipt: receiptId,
            notes: {
                bookingId: bookingId,
                customerId: user.id,
            },
        })

        // 4. Create internal payment record (pending)
        const breakdown = calculatePaymentBreakdown(amount)
        const idempotencyKey = order.id // Use Razorpay Order ID as idempotency key for creation

        const { error: dbError } = await supabase.from("payments").insert({
            booking_id: bookingId,
            customer_id: user.id,
            technician_id: booking.technician_id, // Might be null if not assigned yet
            amount: breakdown.amount,
            platform_fee: breakdown.platformFee,
            technician_payout: breakdown.technicianPayout,
            payment_status: "pending", // Initial status matches DB enum
            payment_provider: "razorpay",
            razorpay_order_id: order.id,
            idempotency_key: idempotencyKey,
        })

        if (dbError) {
            // If it's a duplicate due to idempotency, fetch existing
            if (dbError.code === '23505') { // Unique violation
                const { data: existing } = await supabase
                    .from("payments")
                    .select("razorpay_order_id")
                    .eq("idempotency_key", idempotencyKey)
                    .single()

                if (existing) {
                    return { success: true, orderId: existing.razorpay_order_id, amount: amount * 100, currency: "INR" }
                }
            }
            throw dbError
        }

        // Log creation event
        // We need the payment ID, so we might need to select it back or use separate insert
        // But for now, let's rely on webhook for the "created" event in payment_events roughly
        // Or strictly:
        const { data: payment } = await supabase.from("payments").select("id").eq("razorpay_order_id", order.id).single()
        if (payment) {
            await supabase.from("payment_events").insert({
                payment_id: payment.id,
                event_type: "created",
                idempotency_key: `${idempotencyKey}_init`,
                amount: breakdown.amount,
                metadata: { razorpay_order_id: order.id }
            })
        }

        return {
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        }

    } catch (error: any) {
        console.error("Razorpay order creation error:", error)
        return { success: false, error: error.message }
    }
}
