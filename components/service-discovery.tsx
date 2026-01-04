"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Wrench, Star, MapPin, Clock, Shield, Award, TrendingUp } from "lucide-react"
import { searchServicesByCategory, findAvailableServices } from "@/app/actions/matching-actions"
import type { ServiceCategory } from "@/lib/types"
import Link from "next/link"

interface ServiceDiscoveryProps {
  categories: ServiceCategory[]
  customerCity: string
  customerState: string
  customerLatitude: number
  customerLongitude: number
}

export function ServiceDiscovery({ categories, customerCity, customerState, customerLatitude, customerLongitude }: ServiceDiscoveryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId)
    setLoading(true)

    const result = await searchServicesByCategory(categoryId, customerCity, customerState)
    setServices(result.services || [])
    setLoading(false)
  }

  const handleServiceSelect = async (service: any) => {
    setSelectedService(service)
    setLoading(true)
    console.log("service", service)
    console.log("customerLatitude", customerLatitude)
    console.log("customerLongitude", customerLongitude)
    const result = await findAvailableServices({
      serviceId: service.id,
      customerCity,
      customerState,
      customerLatitude,
      customerLongitude,
    })

    setMatches(result.matches || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="category">Browse by Category</TabsTrigger>
          <TabsTrigger value="search">Describe Problem</TabsTrigger>
        </TabsList>

        <TabsContent value="category" className="space-y-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Service Categories</CardTitle>
              <CardDescription>Select a category to see available services in your area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${selectedCategory === category.id ? "border-primary bg-primary/5" : "border-border"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Wrench className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services in selected category */}
          {services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Services</CardTitle>
                <CardDescription>
                  {services.length} service{services.length !== 0 ? "s" : ""} available in {customerCity},{" "}
                  {customerState}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary ${selectedService?.id === service.id ? "border-primary bg-primary/5" : "border-border"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <div className="flex items-center gap-2">
                          {service.emergency_supported && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Emergency
                            </Badge>
                          )}
                          <span className="font-bold text-primary">${service.base_price}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.estimated_duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {service.warranty_days} day warranty
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched technicians */}
          {matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Technicians</CardTitle>
                <CardDescription>
                  {matches.length} qualified technician{matches.length !== 1 ? "s" : ""} found - sorted by confidence
                  score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.technicianServiceId} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{match.technicianName}</h3>
                            {match.isPreferred && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Star className="h-3 w-3 mr-1 fill-blue-700" />
                                Preferred
                              </Badge>
                            )}
                          </div>
                          {match.businessName && <p className="text-sm text-muted-foreground">{match.businessName}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">${match.customPrice}</p>
                          <p className="text-xs text-muted-foreground">Your Price</p>
                        </div>
                      </div>

                      <div className="grid gap-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Rating:
                          </span>
                          <span className="font-medium">
                            {match.rating.toFixed(1)} ({match.totalReviews} reviews)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            Distance:
                          </span>
                          <span className="font-medium">{match.estimatedDistance} km away</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            ETA:
                          </span>
                          <span className="font-medium">{match.estimatedETA}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Award className="h-3 w-3" />
                            Experience:
                          </span>
                          <span className="font-medium capitalize">{match.experienceLevel}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            Confidence:
                          </span>
                          <span className="font-medium">{match.confidenceScore.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/dashboard/customer/book?service=${match.technicianServiceId}`} className="flex-1">
                          <Button className="w-full">Book Now</Button>
                        </Link>
                        <Link href={`/dashboard/customer/technicians/${match.technicianId}`}>
                          <Button variant="outline">View Profile</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Describe Your Problem</CardTitle>
              <CardDescription>Tell us what you need help with and we'll find the right service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., My toilet is clogged..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered search coming soon. For now, please use Browse by Category.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
