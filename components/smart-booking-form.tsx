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
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Sparkles, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { autoAssignTechnician } from "@/app/actions/assignment-actions"

interface SmartBookingFormProps {
  customerProfile: any
  preselectedService?: any
}

export function SmartBookingForm({ customerProfile, preselectedService }: SmartBookingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookingCreated, setBookingCreated] = useState(false)
  const [assignmentResult, setAssignmentResult] = useState<any>(null)

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Combine date and time
      const [hours, minutes] = time.split(":")
      const scheduledDate = new Date(date)
      scheduledDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))

      // Create booking with auto-assignment
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          technician_id: preselectedService?.technician_id, // temporary - will be updated by auto-assign
          service_id: preselectedService?.id,
          scheduled_date: scheduledDate.toISOString(),
          estimated_duration_minutes: preselectedService?.service?.estimated_duration_minutes || 60,
          service_address: address,
          service_city: city,
          service_state: state,
          service_zip_code: zipCode,
          customer_notes: notes || null,
          total_amount: preselectedService?.custom_price,
          status: "pending",
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      setBookingCreated(true)

      // Trigger auto-assignment
      const assignResult = await autoAssignTechnician(booking.id)

      if (assignResult.error) {
        setError(`Booking created but assignment failed: ${assignResult.error}`)
      } else {
        setAssignmentResult(assignResult)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (bookingCreated && assignmentResult) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">Booking Confirmed!</CardTitle>
          </div>
          <CardDescription>We've automatically assigned the best technician for your job</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Smart Assignment</h3>
                <p className="text-sm text-blue-700">{assignmentResult.assignedTechnician.reason}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Assigned Technician</h4>
            <div className="p-4 rounded-lg border bg-card">
              <p className="font-semibold text-lg mb-2">{assignmentResult.assignedTechnician.technicianName}</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence Score:</span>
                  <span className="font-medium">
                    {assignmentResult.assignedTechnician.rankingFactors.totalScore.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skill Match:</span>
                  <span className="font-medium">
                    {assignmentResult.assignedTechnician.rankingFactors.skillMatchScore.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability:</span>
                  <span className="font-medium">
                    {assignmentResult.assignedTechnician.rankingFactors.workloadBalanceScore.toFixed(0)}%
                  </span>
                </div>
                {assignmentResult.assignedTechnician.rankingFactors.isPreferred && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                    Your Preferred Technician
                  </Badge>
                )}
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
    <Card>
      <CardHeader>
        <CardTitle>Service Details</CardTitle>
        <CardDescription>
          We'll automatically match you with the best available technician using our smart assignment algorithm
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {preselectedService && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold mb-2">{preselectedService.service?.name}</h4>
              <p className="text-sm text-muted-foreground mb-2">{preselectedService.service?.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Selected Technician: {preselectedService.technician?.profile?.full_name}
                </span>
                <span className="text-lg font-bold text-primary">${preselectedService.custom_price}</span>
              </div>
            </div>
          )}

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
            {loading ? "Creating booking..." : "Book with Smart Assignment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
