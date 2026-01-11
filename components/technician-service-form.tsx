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
import { Switch } from "@/components/ui/switch"
import { addTechnicianService, updateTechnicianService } from "@/app/actions/technician-service-actions"
import { AlertCircle, Info, DollarSign, MapPin, Briefcase } from "lucide-react"

interface TechnicianServiceFormProps {
  services: any[]
  technicianService?: any
}

export function TechnicianServiceForm({ services, technicianService }: TechnicianServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // Initialize selected service immediately if editing
  const initialService = technicianService
    ? services.find(s => s.id === technicianService.service_id)
    : null

  const [selectedService, setSelectedService] = useState<any>(initialService)

  const [formData, setFormData] = useState({
    service_id: technicianService?.service_id || "",
    custom_price: technicianService?.custom_price || "",
    coverage_radius_km: technicianService?.coverage_radius_km || "25",
    experience_level: technicianService?.experience_level || "intermediate",
    tools_declared: technicianService?.tools_declared || [],
    is_active: technicianService?.is_active ?? false, // Default to false for new services
  })

  // Determine if we are in edit mode
  const isEditing = !!technicianService

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
      let result

      if (isEditing) {
        result = await updateTechnicianService(technicianService.id, formData)
      } else {
        result = await addTechnicianService(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.push("/dashboard/technician/services")
        router.refresh()
      }
    } catch (err) {
      setError(isEditing ? "Failed to update service" : "Failed to add service")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{isEditing ? "Edit Service" : "Service Details"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your service details and pricing below."
            : "Configure a new service to offer on the platform."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {!isEditing && services.length === 0 && (
            <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>You've already added all available services. Check back later.</span>
            </div>
          )}

          <div className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor="service">Select Service</Label>
              <Select
                value={formData.service_id}
                onValueChange={handleServiceSelect}
                required
                disabled={isEditing}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a service to offer" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} <span className="text-muted-foreground ml-2">({service.category?.name})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-[0.8rem] text-muted-foreground">Service type cannot be modified once created.</p>
              )}
            </div>

            {selectedService && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{selectedService.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedService.description}</p>
                  </div>
                  {selectedService.emergency_supported && (
                    <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                      Emergency
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Base Price</span>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {selectedService.base_price}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Range</span>
                    <p className="font-medium">${selectedService.min_price} - ${selectedService.max_price}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Duration</span>
                    <p className="font-medium">{selectedService.estimated_duration_minutes} mins</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Warranty</span>
                    <p className="font-medium">{selectedService.warranty_days} days</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Your Price ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={formData.custom_price}
                    onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
                    placeholder="0.00"
                    required
                    disabled={!selectedService}
                  />
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  Set your rate within the allowed platform range.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Coverage Radius (km)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="radius"
                    type="number"
                    min="1"
                    max="100"
                    className="pl-9"
                    value={formData.coverage_radius_km}
                    onChange={(e) => setFormData({ ...formData, coverage_radius_km: e.target.value })}
                    required
                  />
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  Max distance: 100km
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level</Label>
              <Select
                value={formData.experience_level}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>Beginner (0-2 years)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="intermediate">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span>Intermediate (2-5 years)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="expert">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-amber-500" />
                      <span>Expert (5+ years)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="text-base">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn off to temporarily hide this service.
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            )}

            {!isEditing && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>New services require admin approval (1-2 business days).</span>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedService || (!isEditing && services.length === 0)} className="flex-1">
              {loading ? (isEditing ? "Updating Service..." : "Adding Service...") : (isEditing ? "Save Changes" : "Submit Service")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
