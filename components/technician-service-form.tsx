"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { addTechnicianService } from "@/app/actions/technician-service-actions"
import { AlertCircle } from "lucide-react"

interface TechnicianServiceFormProps {
  services: any[]
  technicianService?: any
}

export function TechnicianServiceForm({ services, technicianService }: TechnicianServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedService, setSelectedService] = useState<any>(null)

  const [formData, setFormData] = useState({
    service_id: technicianService?.service_id || "",
    custom_price: technicianService?.custom_price || "",
    coverage_radius_km: technicianService?.coverage_radius_km || "25",
    experience_level: technicianService?.experience_level || "intermediate",
    tools_declared: technicianService?.tools_declared || [],
  })

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    setSelectedService(service)
    setFormData({ ...formData, service_id: serviceId, custom_price: service?.base_price || "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validate price is within bounds
    if (selectedService) {
      const price = Number.parseFloat(formData.custom_price)
      if (price < selectedService.min_price || price > selectedService.max_price) {
        setError(`Price must be between $${selectedService.min_price} and $${selectedService.max_price}`)
        setLoading(false)
        return
      }
    }

    try {
      const result = await addTechnicianService(formData)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard/technician/services")
        router.refresh()
      }
    } catch (err) {
      setError("Failed to add service")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Details</CardTitle>
        <CardDescription>Select a service and set your pricing within platform bounds</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {services.length === 0 && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              You've already added all available services. Check back later for new service offerings.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="service">Select Service *</Label>
            <Select value={formData.service_id} onValueChange={handleServiceSelect} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service to offer" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {service.category?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedService && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold mb-2">{selectedService.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{selectedService.description}</p>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform Base Price:</span>
                  <span className="font-medium">${selectedService.base_price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Allowed Price Range:</span>
                  <span className="font-medium">
                    ${selectedService.min_price} - ${selectedService.max_price}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Est. Duration:</span>
                  <span className="font-medium">{selectedService.estimated_duration_minutes} minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Warranty:</span>
                  <span className="font-medium">{selectedService.warranty_days} days</span>
                </div>
                {selectedService.emergency_supported && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Emergency Service Available
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="price">Your Price ($) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.custom_price}
              onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
              placeholder={
                selectedService
                  ? `Between $${selectedService.min_price} and $${selectedService.max_price}`
                  : "Select a service first"
              }
              required
              disabled={!selectedService}
            />
            {selectedService && (
              <p className="text-sm text-muted-foreground">
                Must be between ${selectedService.min_price} and ${selectedService.max_price}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Coverage Radius (km) *</Label>
            <Input
              id="radius"
              type="number"
              min="1"
              max="100"
              value={formData.coverage_radius_km}
              onChange={(e) => setFormData({ ...formData, coverage_radius_km: e.target.value })}
              required
            />
            <p className="text-sm text-muted-foreground">
              How far are you willing to travel for this service? (Max: 100km)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Your Experience Level *</Label>
            <Select
              value={formData.experience_level}
              onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                <SelectItem value="expert">Expert (5+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your service will be pending admin approval before it becomes active. This usually
              takes 1-2 business days.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || !selectedService || services.length === 0} className="flex-1">
              {loading ? "Adding..." : "Add Service"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
