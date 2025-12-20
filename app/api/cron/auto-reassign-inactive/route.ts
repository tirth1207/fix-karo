import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Find confirmed bookings scheduled in the next 2 hours where technician hasn't been active
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, technician_id")
      .in("status", ["confirmed", "technician_en_route"])
      .lte("scheduled_date", twoHoursFromNow)

    const reassigned: string[] = []

    for (const booking of bookings || []) {
      // Check technician's last activity
      const { data: device } = await supabase
        .from("device_bindings")
        .select("last_seen_at")
        .eq("user_id", booking.technician_id)
        .eq("is_active", true)
        .single()

      if (!device || device.last_seen_at < oneHourAgo) {
        // Log ops event
        await supabase.from("ops_events").insert({
          event_type: "technician_inactive",
          entity_type: "booking",
          entity_id: booking.id,
          action_taken: "flagged_for_reassignment",
          reason: "technician_not_seen_in_last_hour",
          metadata: {
            technician_id: booking.technician_id,
            last_seen: device?.last_seen_at,
          },
        })

        // Create fraud alert
        await supabase.from("fraud_alerts").insert({
          user_id: booking.technician_id,
          alert_type: "technician_inactive_before_job",
          severity: "medium",
          description: `Technician inactive before scheduled job at ${booking.scheduled_date}`,
          status: "open",
        })

        reassigned.push(booking.id)
      }
    }

    return NextResponse.json({
      success: true,
      flagged: reassigned.length,
      bookings: reassigned,
    })
  } catch (error: any) {
    console.error("[v0] Auto-reassign cron error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
