import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, CheckCircle2, Clock, XCircle, Edit } from "lucide-react"
import Link from "next/link"

export default async function TechnicianServicesPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "technician") redirect("/dashboard/customer")

  // Get technician's current services with platform service details
  const { data: myServices } = await supabase
    .from("technician_services")
    .select(
      `
      *,
      service:services(
        id,
        name,
        description,
        base_price,
        min_price,
        max_price,
        estimated_duration_minutes,
        warranty_days,
        emergency_supported,
        category:service_categories(name, icon_name)
      )
    `,
    )
    .eq("technician_id", user.id)
    .order("created_at", { ascending: false })

  const approvedCount = myServices?.filter((s) => s.approval_status === "approved").length || 0
  const pendingCount = myServices?.filter((s) => s.approval_status === "pending").length || 0
  const activeCount = myServices?.filter((s) => s.is_active && s.approval_status === "approved").length || 0

  return (
    <div className="min-h-screen bg-background">
      <TechnicianNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Services</h1>
            <p className="text-muted-foreground mt-1">Manage the services you offer to customers</p>
          </div>
          <Link href="/dashboard/technician/services/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Services</CardDescription>
              <CardTitle className="text-3xl text-green-600">{activeCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved Services</CardDescription>
              <CardTitle className="text-3xl">{approvedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Services</CardTitle>
            <CardDescription>
              Services require admin approval before becoming active. Price must be within platform bounds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myServices && myServices.length > 0 ? (
              <div className="space-y-4">
                {myServices.map((techService: any) => (
                  <div
                    key={techService.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{techService.service?.name}</h3>
                        {techService.approval_status === "approved" && techService.is_active && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        {techService.approval_status === "pending" && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Approval
                          </Badge>
                        )}
                        {techService.approval_status === "rejected" && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {techService.approval_status === "approved" && !techService.is_active && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Inactive
                          </Badge>
                        )}
                        {techService.service?.emergency_supported && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Emergency
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{techService.service?.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Category:{" "}
                          <span className="font-medium text-foreground">{techService.service?.category?.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Your Price: <span className="font-medium text-foreground">${techService.custom_price}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Platform Range:{" "}
                          <span className="font-medium text-foreground">
                            ${techService.service?.min_price} - ${techService.service?.max_price}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Coverage:{" "}
                          <span className="font-medium text-foreground">{techService.coverage_radius_km} km</span>
                        </span>
                        {techService.experience_level && (
                          <span className="text-muted-foreground">
                            Level:{" "}
                            <span className="font-medium text-foreground capitalize">
                              {techService.experience_level}
                            </span>
                          </span>
                        )}
                      </div>
                      {techService.rejection_reason && (
                        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                          <p className="text-sm text-red-700">
                            <strong>Rejection reason:</strong> {techService.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <Link href={`/dashboard/technician/services/${techService.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't added any services yet</p>
                <Link href="/dashboard/technician/services/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Service
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
