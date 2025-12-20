import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Find bookings that are significantly overdue (SLA breach)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, customer_id, payment_id")
      .in("status", ["confirmed", "technician_en_route"])
      .lte("scheduled_date", fourHoursAgo)

    const refunded: string[] = []

    for (const booking of bookings || []) {
      // Get payment
      const { data: payment } = await supabase.from("payments").select("*").eq("booking_id", booking.id).single()

      if (payment && payment.payment_status === "held_in_escrow") {
        // Issue refund
        const { error } = await supabase
          .from("payments")
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: "SLA breach - job not started within 4 hours of scheduled time",
          })
          .eq("id", payment.id)

        if (error) {
          console.error(`[v0] Failed to refund payment ${payment.id}:`, error.message)
          continue
        }

        // Create payment event
        await supabase.from("payment_events").insert({
          payment_id: payment.id,
          event_type: "refunded",
          idempotency_key: `sla_refund_${payment.id}_${Date.now()}`,
          amount: payment.amount,
          metadata: { reason: "sla_breach", auto_refunded: true },
        })

        // Log ops event
        await supabase.from("ops_events").insert({
          event_type: "sla_breach_detected",
          entity_type: "booking",
          entity_id: booking.id,
          action_taken: "automatic_refund_issued",
          reason: "job_not_started_within_sla",
          metadata: {
            customer_id: booking.customer_id,
            technician_id: booking.technician_id,
            refund_amount: payment.amount,
          },
        })

        // Update booking
        await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            cancellation_reason: "SLA breach - automatic refund issued",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", booking.id)

        refunded.push(booking.id)
      }
    }

    return NextResponse.json({
      success: true,
      refunded: refunded.length,
      bookings: refunded,
    })
  } catch (error: any) {
    console.error("[v0] SLA breach cron error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
