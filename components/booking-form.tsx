"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

type Service = {
  id: string
  service_id: {
    name: string,
    description: string,
    base_price: number,
  }
  service_name: string
  base_price: number
  estimated_duration_minutes: number
}

export function BookingForm({ technicianId, services }: { technicianId: string; services: Service[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedService, setSelectedService] = useState<string>("")
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [city, setCity] = useState<string>("")
  const [state, setState] = useState<string>("")
  const [zipCode, setZipCode] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!selectedService || !date || !time) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("You must be logged in to book a service")
      }

      const service = services.find((s) => s.id === selectedService)
      if (!service) {
        throw new Error("Invalid service selected")
      }

      // Combine date and time
      const [hours, minutes] = time.split(":")
      const scheduledDate = new Date(date)
      scheduledDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))

      const { error: bookingError } = await supabase.from("bookings").insert({
        customer_id: user.id,
        technician_id: technicianId,
        service_id: selectedService,
        scheduled_date: scheduledDate.toISOString(),
        estimated_duration_minutes: service.estimated_duration_minutes,
        service_address: address,
        service_city: city,
        service_state: state,
        service_zip_code: zipCode,
        customer_notes: notes || null,
        total_amount: service.service_id.base_price,
        status: "pending",
      })
      console.log(bookingError)
      if (bookingError) throw bookingError

      router.push("/dashboard/customer?success=booking-created")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedServiceData = services.find((s) => s.id === selectedService)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="service">Service</Label>
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger>
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.service_id.name} - ${service.service_id.base_price}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
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
        <Label htmlFor="time">Time</Label>
        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Service Address</Label>
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
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" placeholder="CA" value={state} onChange={(e) => setState(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zipCode">Zip Code</Label>
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

      {selectedServiceData && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-medium">${selectedServiceData.service_id.base_price}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated duration</span>
            <span className="font-medium">{selectedServiceData.estimated_duration_minutes || 60} mins</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating booking..." : "Book now"}
      </Button>
    </form>
  )
}
