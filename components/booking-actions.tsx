"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { confirmBookingWithPayment, completeBookingAndReleasePayment } from "@/app/actions/booking-actions"
import { CheckCircle2, XCircle, PlayCircle, Loader2 } from "lucide-react"

export function BookingActions({ bookingId, currentStatus }: { bookingId: string; currentStatus: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = async (newStatus: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (notes) {
        updates.technician_notes = notes
      }

      if (newStatus === "in_progress") {
        updates.actual_start_time = new Date().toISOString()
      } else if (newStatus === "cancelled") {
        updates.cancelled_by = user.id
        updates.cancelled_at = new Date().toISOString()
        updates.cancellation_reason = notes || "Cancelled by technician"
      }

      const { error: updateError } = await supabase.from("bookings").update(updates).eq("id", bookingId)

      if (updateError) throw updateError

      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmBooking = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await confirmBookingWithPayment(bookingId)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteBooking = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await completeBookingAndReleasePayment(bookingId, notes)

      if (!result.success) {
        throw new Error(result.error)
      }

      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {currentStatus === "pending" && (
        <>
          <Button onClick={handleConfirmBooking} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Accept booking
          </Button>
          <div className="space-y-2">
            <Label htmlFor="notes">Reason (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={() => updateStatus("cancelled")}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Decline booking
          </Button>
        </>
      )}

      {currentStatus === "confirmed" && (
        <>
          <Button onClick={() => updateStatus("in_progress")} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Start job
          </Button>
          <div className="space-y-2">
            <Label htmlFor="notes">Cancellation reason</Label>
            <Textarea
              id="notes"
              placeholder="Why are you cancelling?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={() => updateStatus("cancelled")} disabled={isLoading} variant="outline" className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Cancel booking
          </Button>
        </>
      )}

      {currentStatus === "in_progress" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="notes">Job completion notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe work completed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleCompleteBooking} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Mark as completed
          </Button>
          <p className="text-xs text-muted-foreground">
            Payment will be held in escrow until admin releases funds after verification
          </p>
        </>
      )}

      {(currentStatus === "completed" || currentStatus === "cancelled") && (
        <p className="text-center text-sm text-muted-foreground">This booking is {currentStatus}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
