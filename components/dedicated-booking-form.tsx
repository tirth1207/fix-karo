"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock, MapPin, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { createBooking } from "@/app/actions/booking-creation"
import { toast } from "sonner"

interface DedicatedBookingFormProps {
    technicianId: string
    serviceId: string
    totalAmount: number
    initialData?: {
        city?: string
        state?: string
        zipCode?: string
        address?: string
    }
}

export function DedicatedBookingForm({ technicianId, serviceId, totalAmount, initialData }: DedicatedBookingFormProps) {
    const router = useRouter()
    const [date, setDate] = useState<Date>()
    const [time, setTime] = useState<string>("")
    const [address, setAddress] = useState<string>(initialData?.address || "")
    const [city, setCity] = useState<string>(initialData?.city || "")
    const [state, setState] = useState<string>(initialData?.state || "")
    const [zipCode, setZipCode] = useState<string>(initialData?.zipCode || "")
    const [notes, setNotes] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date || !time || !address || !city || !state || !zipCode) {
            toast.error("Please fill in all required fields")
            return
        }

        setIsLoading(true)

        try {
            const [hours, minutes] = time.split(":")
            const scheduledDate = new Date(date)
            scheduledDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))

            const result = await createBooking({
                technicianId,
                serviceId,
                scheduledDate: scheduledDate.toISOString(),
                address,
                city,
                state,
                zipCode,
                notes,
                totalAmount,
            })

            if (result.success) {
                toast.success("Booking created successfully!")
                router.push("/dashboard/customer?success=booking-created")
            } else {
                toast.error(result.error || "Failed to create booking")
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Schedule Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                                type="button"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {date ? format(date, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="time" className="text-sm font-medium">Preferred Time</Label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input
                            id="time"
                            type="time"
                            className="pl-10 h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Service Address</Label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" />
                    <Input
                        id="address"
                        placeholder="Street address, apartment, suite"
                        className="pl-10 h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">City</Label>
                    <Input
                        id="city"
                        className="h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">State</Label>
                    <Input
                        id="state"
                        placeholder="e.g. CA"
                        className="h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium">Zip Code</Label>
                <Input
                    id="zipCode"
                    className="h-11 border-muted-foreground/20 hover:border-primary/50 transition-colors"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    placeholder="e.g. gate code, specific issues, parking instructions..."
                    className="min-h-[100px] border-muted-foreground/20 hover:border-primary/50 transition-colors resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Booking...
                    </>
                ) : (
                    "Confirm Booking"
                )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
                By clicking confirm, you agree to our terms of service and technician's policy.
            </p>
        </form>
    )
}
