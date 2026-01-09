"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { transitionBookingStatus, generateOTP } from "@/app/actions/booking-state-machine"
import { CheckCircle2, XCircle, PlayCircle, Loader2 } from "lucide-react"
import { OTPVerificationDialog } from "@/components/otp-verification-dialog"

export function BookingActions({ bookingId, currentStatus }: { bookingId: string; currentStatus: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpDialog, setOtpDialog] = useState<{
    isOpen: boolean
    type: "job_start" | "job_completion"
  }>({ isOpen: false, type: "job_start" })

  const handleUpdateStatus = async (newStatus: string, otpCode?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await transitionBookingStatus(bookingId, newStatus, {
        notes,
        otpCode,
        cancellationReason: newStatus === "cancelled" ? notes || "Cancelled by technician" : undefined,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setOtpDialog({ ...otpDialog, isOpen: false })
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const initiateStatusChange = async (newStatus: string) => {
    if (newStatus === "technician_en_route") {
      // For job start, we first generate OTP and show dialog
      setIsLoading(true)
      try {
        const result = await generateOTP(bookingId, "job_start")
        if (!result.success) throw new Error(result.error)
        setOtpDialog({ isOpen: true, type: "job_start" })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (newStatus === "awaiting_customer_confirmation") {
      // For job completion, we first generate OTP and show dialog
      setIsLoading(true)
      try {
        const result = await generateOTP(bookingId, "job_completion")
        if (!result.success) throw new Error(result.error)
        setOtpDialog({ isOpen: true, type: "job_completion" })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Default status change
    await handleUpdateStatus(newStatus)
  }

  const handleVerifyOTP = async (otpCode: string) => {
    const nextStatus = otpDialog.type === "job_start" ? "technician_en_route" : "awaiting_customer_confirmation"
    await handleUpdateStatus(nextStatus, otpCode)
  }

  return (
    <div className="space-y-4">
      {currentStatus === "pending" && (
        <>
          <Button onClick={() => initiateStatusChange("confirmed")} disabled={isLoading} className="w-full">
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
            onClick={() => initiateStatusChange("cancelled")}
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
          <Button onClick={() => initiateStatusChange("technician_en_route")} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Start job (Requires OTP)
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
          <Button
            onClick={() => initiateStatusChange("cancelled")}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Cancel booking
          </Button>
        </>
      )}

      {(currentStatus === "technician_en_route" || currentStatus === "in_progress") && (
        <>
          {currentStatus === "technician_en_route" && (
            <Button onClick={() => initiateStatusChange("in_progress")} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Set as In Progress
            </Button>
          )}
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
          <Button onClick={() => initiateStatusChange("awaiting_customer_confirmation")} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Mark as completed (Requires OTP)
          </Button>
          <p className="text-xs text-muted-foreground">
            Payment will be held in escrow until completion is verified with customer OTP.
          </p>
        </>
      )}

      {(currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "awaiting_customer_confirmation") && (
        <p className="text-center text-sm text-muted-foreground">
          This booking is {currentStatus.replace(/_/g, " ")}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <OTPVerificationDialog
        isOpen={otpDialog.isOpen}
        onClose={() => setOtpDialog({ ...otpDialog, isOpen: false })}
        onVerify={handleVerifyOTP}
        bookingId={bookingId}
        otpType={otpDialog.type}
        isLoading={isLoading}
      />
    </div>
  )
}
