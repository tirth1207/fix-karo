"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ServiceCategory } from "@/lib/types"
import { createService } from "@/app/actions/service-actions"

interface ServiceFormProps {
  categories: ServiceCategory[]
  service?: any
}

export function ServiceForm({ categories, service }: ServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    category_id: service?.category_id || "",
    name: service?.name || "",
    description: service?.description || "",
    base_price: service?.base_price || "",
    min_price: service?.min_price || "",
    max_price: service?.max_price || "",
    estimated_duration_minutes: service?.estimated_duration_minutes || "",
    warranty_days: service?.warranty_days || "30",
    emergency_supported: service?.emergency_supported || false,
    is_active: service?.is_active ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await createService(formData)
      if (result.error) {
        setError(result.error)
      } else {
        router.push("/admin/services")
        router.refresh()
      }
    } catch (err) {
      setError("Failed to create service")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Details</CardTitle>
        <CardDescription>Define pricing bounds, duration, and service parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Drain Unclogging"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this service includes"
              rows={3}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price ($) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_price">Min Price ($) *</Label>
              <Input
                id="min_price"
                type="number"
                step="0.01"
                value={formData.min_price}
                onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_price">Max Price ($) *</Label>
              <Input
                id="max_price"
                type="number"
                step="0.01"
                value={formData.max_price}
                onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty">Warranty (days) *</Label>
              <Input
                id="warranty"
                type="number"
                value={formData.warranty_days}
                onChange={(e) => setFormData({ ...formData, warranty_days: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="emergency">Emergency Service</Label>
              <p className="text-sm text-muted-foreground">Available for urgent requests with higher priority</p>
            </div>
            <Switch
              id="emergency"
              checked={formData.emergency_supported}
              onCheckedChange={(checked) => setFormData({ ...formData, emergency_supported: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Service</Label>
              <p className="text-sm text-muted-foreground">Service will be available for technicians to offer</p>
            </div>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Service"}
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
