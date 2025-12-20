"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { releasePaymentToTechnician, refundPayment } from "@/app/actions/payment-actions"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function PaymentActionsAdmin({ paymentId, currentStatus }: { paymentId: string; currentStatus: string }) {
  const [refundReason, setRefundReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleReleasePayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await releasePaymentToTechnician(paymentId)

      if (!result.success) {
        throw new Error(result.error)
      }

      window.location.reload()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      setError("Please provide a reason for the refund")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await refundPayment(paymentId, refundReason)

      if (!result.success) {
        throw new Error(result.error)
      }

      setOpen(false)
      window.location.reload()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (currentStatus === "released") {
    return <p className="text-sm text-muted-foreground">Payment has been released to technician</p>
  }

  if (currentStatus === "refunded") {
    return <p className="text-sm text-muted-foreground">Payment has been refunded to customer</p>
  }

  return (
    <div className="space-y-4">
      {currentStatus === "held_in_escrow" && (
        <Button onClick={handleReleasePayment} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Release payment to technician
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={isLoading}>
            <XCircle className="mr-2 h-4 w-4" />
            Issue refund
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>Provide a reason for this refund. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refundReason">Refund Reason</Label>
              <Textarea
                id="refundReason"
                placeholder="Explain why this payment is being refunded..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleRefund} disabled={isLoading} variant="destructive" className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm refund"}
              </Button>
              <Button onClick={() => setOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
