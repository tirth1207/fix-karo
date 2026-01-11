import { TechnicianNav } from '@/components/technician-nav'
import { TechnicianProfileEditor } from '@/components/technician-profile-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function TechnicianProfilesPage() {
    const supabase = await createServerClient()

    const {
    data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect("/auth/login")

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (profile?.role !== "technician") redirect("/dashboard/customer")

    // Verify the technician profile exists; otherwise require onboarding
    const { data: techProfile } = await supabase.from("technician_profiles").select("id").eq("id", user.id).single()
    if (!techProfile) redirect("/dashboard/technician/onboarding")

   const { data: technicians, error } = await supabase
    .from("technician_profiles")
    .select(
      `
      *,
      profile:profiles!technician_profiles_id_fkey(id, full_name, email, phone, city, state, zip_code),
      verified_by_profile:profiles!technician_profiles_verified_by_fkey(id, full_name, email)
    `,
    )
    .eq("id", user.id)
    .order("created_at", { ascending: false })

  // Log both data and any error for debugging RLS/permission issues
  if (error) {
    console.error("Failed to fetch technician_profiles:", error)
  }
  console.log({ technicians, error })

  const tech = technicians && technicians.length > 0 ? technicians[0] : null

  return (
    <div className="flex min-h-svh flex-col">
      <TechnicianNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {tech?.profile?.full_name ? tech.profile.full_name.split(" ").map((s: string) => s[0]).slice(0,2).join("") : "T"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{tech?.profile?.full_name}</h1>
                <p className="text-sm text-muted-foreground">{tech?.business_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="font-medium">{tech?.created_at ? new Date(tech.created_at).toLocaleDateString() : "-"}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-md p-4">
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <p className="text-sm text-muted-foreground">View and edit your public profile details</p>
                  </div>
                </div>
              </div>

              <div>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-sm text-muted-foreground">Full name</h3>
                        <p className="font-medium">{tech?.profile?.full_name}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Business</h3>
                        <p className="font-medium">{tech?.business_name || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Specializations</h3>
                        <p className="font-medium">{(tech?.specializations || []).join(", ") || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Years experience</h3>
                        <p className="font-medium">{tech?.years_of_experience ?? "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">City</h3>
                        <p className="font-medium">{tech?.profile?.city || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">State</h3>
                        <p className="font-medium">{tech?.profile?.state || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Zip code</h3>
                        <p className="font-medium">{tech?.profile?.zip_code || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Phone</h3>
                        <p className="font-medium">{tech?.profile?.phone || "-"}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Rating</h3>
                        <p className="font-medium">{tech?.rating?.toFixed ? tech.rating.toFixed(1) : tech?.rating}</p>
                      </div>

                      <div>
                        <h3 className="text-sm text-muted-foreground">Verification status</h3>
                        <p className="font-medium">{tech?.verification_status}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="edit" className="mt-4">
                    {/* Client form to update profile */}
                    {/* @ts-ignore */}
                    <div className="max-w-2xl">
                      <TechnicianProfileEditor initial={tech} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}