"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader2, RefreshCw } from "lucide-react"
import { generateOTP } from "@/app/actions/booking-state-machine"

interface OTPVerificationDialogProps {
    isOpen: boolean
    onClose: () => void
    onVerify: (otp: string) => Promise<void>
    bookingId: string
    otpType: "job_start" | "job_completion"
    isLoading: boolean
}

export function OTPVerificationDialog({
    isOpen,
    onClose,
    onVerify,
    bookingId,
    otpType,
    isLoading,
}: OTPVerificationDialogProps) {
    const [otp, setOtp] = useState("")
    const [cooldown, setCooldown] = useState(0)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(timer)
    }, [cooldown])

    const handleResend = async () => {
        setResending(true)
        setError(null)
        try {
            const result = await generateOTP(bookingId, otpType)
            if (result.success) {
                setCooldown(30)
            } else {
                setError(result.error || "Failed to resend OTP")
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setResending(false)
        }
    }

    const handleComplete = (value: string) => {
        onVerify(value)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>OTP Verification</DialogTitle>
                    <DialogDescription>
                        Enter the 6-digit code sent to the customer's phone to proceed.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        onComplete={handleComplete}
                        disabled={isLoading}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex flex-col items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResend}
                            disabled={cooldown > 0 || resending}
                            className="text-xs"
                        >
                            {resending ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-3 w-3" />
                            )}
                            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                        </Button>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onVerify(otp)}
                        disabled={otp.length !== 6 || isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
