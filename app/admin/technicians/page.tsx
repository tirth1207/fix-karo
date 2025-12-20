import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Star, MapPin, Shield, Clock, AlertTriangle } from "lucide-react"

export default async function TechniciansManagementPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  // Fetch all technicians
  const { data: technicians } = await supabase
    .from("technician_profiles")
    .select(
      `
      *,
      profile:profiles(full_name, email, phone, city, state)
    `,
    )
    .order("created_at", { ascending: false })

  const pendingTechnicians = technicians?.filter((t) => t.verification_status === "pending")
  const verifiedTechnicians = technicians?.filter((t) => t.verification_status === "verified")
  const rejectedTechnicians = technicians?.filter((t) => t.verification_status === "rejected")
  const suspendedTechnicians = technicians?.filter((t) => t.verification_status === "suspended")

  const TechnicianCard = ({ technician }: { technician: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{technician.profile?.full_name}</CardTitle>
            <CardDescription>{technician.business_name}</CardDescription>
          </div>
          <Badge
            variant={
              technician.verification_status === "verified"
                ? "default"
                : technician.verification_status === "suspended"
                  ? "destructive"
                  : "secondary"
            }
            className="bg-transparent"
          >
            {technician.verification_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">
              {technician.rating?.toFixed(1) || "N/A"} ({technician.total_reviews} reviews)
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {technician.profile?.city}, {technician.profile?.state}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{technician.years_of_experience || 0}+ years experience</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {technician.background_check_completed && (
              <Badge variant="outline" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Background checked
              </Badge>
            )}
            {technician.license_number && (
              <Badge variant="outline" className="text-xs">
                Licensed
              </Badge>
            )}
            {technician.insurance_policy_number && (
              <Badge variant="outline" className="text-xs">
                Insured
              </Badge>
            )}
          </div>

          {!technician.is_active && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Account suspended</span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Link href={`/admin/technicians/${technician.id}`}>
              <Button size="sm" variant="outline">
                Manage
              </Button>
            </Link>
            <Link href={`/dashboard/customer/technicians/${technician.id}`}>
              <Button size="sm" variant="outline">
                View profile
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <AdminNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Technician Management</h1>
            <p className="text-muted-foreground">Verify and manage service providers</p>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingTechnicians?.length || 0})</TabsTrigger>
              <TabsTrigger value="verified">Verified ({verifiedTechnicians?.length || 0})</TabsTrigger>
              <TabsTrigger value="suspended">Suspended ({suspendedTechnicians?.length || 0})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedTechnicians?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingTechnicians && pendingTechnicians.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingTechnicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No pending verifications</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              {verifiedTechnicians && verifiedTechnicians.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {verifiedTechnicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No verified technicians</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="suspended" className="space-y-4">
              {suspendedTechnicians && suspendedTechnicians.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suspendedTechnicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No suspended accounts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedTechnicians && rejectedTechnicians.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rejectedTechnicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No rejected applications</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
