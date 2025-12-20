import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default async function AdminServicesPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin") redirect("/dashboard/customer")

  // Get all services with category info
  const { data: services } = await supabase
    .from("services")
    .select(`
      *,
      category:service_categories(name, icon_name)
    `)
    .order("created_at", { ascending: false })

  // Get categories for stats
  const { data: categories } = await supabase.from("service_categories").select("*").order("display_order")

  const activeServices = services?.filter((s) => s.is_active).length || 0
  const totalServices = services?.length || 0

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Service Catalog</h1>
            <p className="text-muted-foreground mt-1">Manage platform services, pricing, and availability</p>
          </div>
          <Link href="/admin/services/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Services</CardDescription>
              <CardTitle className="text-3xl">{totalServices}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Services</CardDescription>
              <CardTitle className="text-3xl text-green-600">{activeServices}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl">{categories?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg. Base Price</CardDescription>
              <CardTitle className="text-3xl">
                ${services?.reduce((sum, s) => sum + Number(s.base_price), 0) / (services?.length || 1) || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Services</CardTitle>
            <CardDescription>
              Platform-controlled service catalog. Services with bookings cannot be edited directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services?.map((service: any) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{service.name}</h3>
                      {service.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {service.has_bookings && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Has Bookings
                        </Badge>
                      )}
                      {service.emergency_supported && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Emergency
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Category: <span className="font-medium text-foreground">{service.category?.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Base: <span className="font-medium text-foreground">${service.base_price}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Range:{" "}
                        <span className="font-medium text-foreground">
                          ${service.min_price} - ${service.max_price}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Duration:{" "}
                        <span className="font-medium text-foreground">{service.estimated_duration_minutes} min</span>
                      </span>
                      <span className="text-muted-foreground">
                        Warranty: <span className="font-medium text-foreground">{service.warranty_days} days</span>
                      </span>
                    </div>
                  </div>
                  <Link href={`/admin/services/${service.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
