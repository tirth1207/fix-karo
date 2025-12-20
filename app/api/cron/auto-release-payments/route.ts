import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Find payments ready for auto-release
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*, booking_id, technician_id")
      .eq("payment_status", "held_in_escrow")
      .lte("auto_release_at", new Date().toISOString())

    if (error) throw error

    const released: string[] = []
    const failed: string[] = []

    for (const payment of payments || []) {
      try {
        // Check if booking is disputed
        const { data: booking } = await supabase.from("bookings").select("status").eq("id", payment.booking_id).single()

        if (booking?.status === "disputed") {
          console.log(`[v0] Skipping auto-release for disputed booking: ${payment.booking_id}`)
          continue
        }

        // Release payment
        const { error: releaseError } = await supabase
          .from("payments")
          .update({
            payment_status: "released",
            released_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        if (releaseError) throw releaseError

        // Create payment event
        await supabase.from("payment_events").insert({
          payment_id: payment.id,
          event_type: "released",
          idempotency_key: `auto_release_${payment.id}_${Date.now()}`,
          amount: payment.technician_payout,
          metadata: { auto_released: true },
        })

        // Log ops event
        await supabase.from("ops_events").insert({
          event_type: "payment_auto_released",
          entity_type: "payment",
          entity_id: payment.id,
          action_taken: "automatic_escrow_release",
          reason: "timeout_reached_no_dispute",
          metadata: {
            technician_id: payment.technician_id,
            amount: payment.technician_payout,
          },
        })

        released.push(payment.id)
      } catch (err: any) {
        console.error(`[v0] Failed to auto-release payment ${payment.id}:`, err.message)
        failed.push(payment.id)
      }
    }

    return NextResponse.json({
      success: true,
      released: released.length,
      failed: failed.length,
      details: { released, failed },
    })
  } catch (error: any) {
    console.error("[v0] Auto-release cron error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
