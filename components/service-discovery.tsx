"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Clock, Shield, Star, Users, Zap, Home, Droplets, Paintbrush, Truck } from "lucide-react"
import { searchServicesByCategory, findAvailableServices } from "@/app/actions/matching-actions"
import type { ServiceCategory } from "@/lib/types"

interface ServiceDiscoveryProps {
  categories: ServiceCategory[]
  customerCity: string
  customerState: string
  customerLatitude: number
  customerLongitude: number
}

// Map common categories to icons and colors for a better UI
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  if (name.includes("cleaning") || name.includes("pest")) return { icon: Droplets, color: "text-blue-500", bg: "bg-blue-50" }
  if (name.includes("electric") || name.includes("plumb")) return { icon: Zap, color: "text-amber-500", bg: "bg-amber-50" }
  if (name.includes("paint") || name.includes("waterproof")) return { icon: Paintbrush, color: "text-purple-500", bg: "bg-purple-50" }
  if (name.includes("salon") || name.includes("beauty")) return { icon: Star, color: "text-pink-500", bg: "bg-pink-50" }
  if (name.includes("ac") || name.includes("appliance")) return { icon: Home, color: "text-cyan-500", bg: "bg-cyan-50" }
  if (name.includes("move") || name.includes("pack")) return { icon: Truck, color: "text-orange-500", bg: "bg-orange-50" }
  return { icon: Shield, color: "text-primary", bg: "bg-primary/10" }
}

export function ServiceDiscovery({ categories, customerCity, customerState, customerLatitude, customerLongitude }: ServiceDiscoveryProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId)
    setLoading(true)

    const result = await searchServicesByCategory(categoryId, customerCity, customerState)
    setServices(result.services || [])
    setLoading(false)
  }

  const handleServiceSelect = async (service: any) => {
    setLoading(true)
    const result = await findAvailableServices({
      serviceId: service.id,
      customerCity,
      customerState,
      customerLatitude,
      customerLongitude,
    })

    if (result.matches && result.matches.length > 0) {
      const firstMatch = result.matches[0]
      router.push(`/dashboard/customer/book?service=${firstMatch.technicianServiceId}`)
    } else {
      alert("No technicians currently available for this service in your area.")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero / Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Home services at your <span className="text-primary">doorstep</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Trusted professionals for all your home needs in {customerCity}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: What are you looking for? (Category Grid) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <Card className="h-full border shadow-lg overflow-hidden">
            <div className="p-6 border-b bg-muted/20">
              <h2 className="text-xl font-bold text-foreground">What are you looking for?</h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const { icon: Icon, color, bg } = getCategoryIcon(category.name)
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 hover:shadow-md border ${selectedCategory === category.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-transparent bg-muted/30 hover:bg-muted/60"
                        }`}
                    >
                      <div className={`h-12 w-12 rounded-full ${bg} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                      </div>
                      <span className="text-xs font-semibold text-center text-foreground line-clamp-2">
                        {category.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Feature Collage / Service List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Collage (Visible only when no category selected) */}
          {!selectedCategory && (
            <div className="hidden lg:grid grid-cols-2 gap-4 h-full min-h-[400px]">
              <div className="rounded-2xl overflow-hidden shadow-lg relative group">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Modern Living Room Cleaning"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-bold text-lg">Premium Cleaning</p>
                </div>
              </div>
              <div className="grid grid-rows-2 gap-4">
                <div className="rounded-2xl overflow-hidden shadow-lg relative group">
                  <img
                    src="https://images.unsplash.com/photo-1581578731117-104f2a8d467e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="AC Repair"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-bold">Expert Repairs</p>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg relative group">
                  <img
                    src="https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Plumbing"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-bold">Quick Fixes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service List (Visible when category selected) */}
          {selectedCategory && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Available Services</h3>
                <Badge variant="outline" className="text-muted-foreground cursor-pointer" onClick={() => setSelectedCategory(null)}>Clear Selection</Badge>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 w-full rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : services.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{service.name}</h4>
                          <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">${service.base_price}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.estimated_duration_minutes}m</span>
                          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Warranty</span>
                        </div>
                      </div>
                      <Button size="sm" className="w-full rounded-t-none bg-primary/90 hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0">
                        Book Now
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">No services found in this category.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trust Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-t">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <div>
            <p className="text-2xl font-bold">4.8</p>
            <p className="text-sm text-muted-foreground">Service Rating</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">12M+</p>
            <p className="text-sm text-muted-foreground">Customers Globally</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground">Verified Pros</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">24/7</p>
            <p className="text-sm text-muted-foreground">Support</p>
          </div>
        </div>
      </div>
    </div>
  )
}
