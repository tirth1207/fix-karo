"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Star, Shield, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { rebookWithTechnician } from "@/app/actions/rebooking-actions"

interface RebookingFormProps {
  technician: any
  customerProfile: any
  previousBooking: any
  serviceId?: string
}

export function RebookingForm({ technician, customerProfile, previousBooking, serviceId }: RebookingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>("")
  const [address, setAddress] = useState<string>(customerProfile?.address || "")
  const [city, setCity] = useState<string>(customerProfile?.city || "")
  const [state, setState] = useState<string>(customerProfile?.state || "")
  const [zipCode, setZipCode] = useState<string>(customerProfile?.zip_code || "")
  const [notes, setNotes] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!date || !time) {
      setError("Please select date and time")
      setLoading(false)
      return
    }

    try {
      const result = await rebookWithTechnician(
        previousBooking.id,
        date.toISOString(),
        time,
        address,
        city,
        state,
        zipCode,
        notes,
      )

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">Booking Confirmed!</CardTitle>
          </div>
          <CardDescription>Your rebooking has been created successfully</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Platform Protection Active</h3>
                <p className="text-sm text-blue-700">
                  Your payment is held in escrow and will be released after job completion. Warranty coverage included.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => router.push("/dashboard/customer")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Rebooking with Preferred Technician</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Technician:</span>
              <span className="font-semibold text-blue-900">{technician.profile?.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Rating:</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="font-medium text-blue-900">{technician.rating?.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Previous Service:</span>
              <span className="font-medium text-blue-900">{previousBooking?.technician_service?.service?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Current Price:</span>
              <span className="font-bold text-blue-900">${previousBooking?.technician_service?.custom_price}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>All bookings go through our platform with escrow protection</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Platform booking required for warranty coverage. Offline payments disable warranty and may result in
                  technician suspension.
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Service Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-transparent"
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={(date) => date < new Date()} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Preferred Time *</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Service Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" placeholder="CA" value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating booking..." : "Book Now with Platform Protection"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
