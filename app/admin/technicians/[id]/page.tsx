import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { AdminTechnicianActions } from '@/components/admin-technician-actions'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import React from 'react'
import {
  Wrench,
  Hammer,
  Zap,
  Droplet,
  Paintbrush,
  Flame,
  Settings,
  Sparkles,
} from "lucide-react"
import { Button } from '@/components/ui/button'
import { AdminTechnicianServices } from '@/components/admin-technician-services'

const SERVICE_ICONS: Record<string, React.ElementType> = {
  wrench: Wrench,
  hammer: Hammer,
  sparkles: Sparkles,
  zap: Zap,
  droplet: Droplet,
  paintbrush: Paintbrush,
  flame: Flame,
  settings: Settings,
}

export default async function AdminTechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const { id } = await params

  const { data: technician, error } = await supabase
    .from('technician_profiles')
    .select(`*, profile:profiles!technician_profiles_id_fkey(full_name, email, phone, city, state, zip_code, avatar_url), verified_by_profile:profiles!technician_profiles_verified_by_fkey(id, full_name, email)`)
    .eq('id', id)
    .single()

  if (error) console.error('Failed to fetch technician profile:', error)

  const { data: techServices, error: servicesError } = await supabase
    .from('technician_services')
    .select(`*,
        service_id:services!technician_services_service_id_fkey(name, description, category_id:service_categories!services_category_id_fkey(name, description, icon_name))`)
    .eq('technician_id', id)
    console.log(techServices)
    if (servicesError) console.error('Failed to fetch technician services:', servicesError)

  if (!technician) notFound()

  return (
    <div className="flex min-h-svh flex-col">
      <AdminNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Technician #{technician.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">{technician.profile?.full_name} — {technician.business_name}</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-transparent">{technician.verification_status}</Badge>
              {!technician.is_active && <Badge className="bg-destructive/10 text-destructive">suspended</Badge>}
              <Link href={`/dashboard/customer/technicians/${technician.id}`} className="text-sm text-primary underline">
                View public profile
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
                      {technician.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={technician.profile?.avatar_url} alt={technician.profile?.full_name || 'avatar'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">No avatar</div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{technician.profile?.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{technician.business_name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold">Contact</h4>
                      <p className="text-sm text-muted-foreground">{technician.profile?.email}</p>
                      {technician.profile?.phone && <p className="text-sm text-muted-foreground">{technician.profile.phone}</p>}
                      <p className="text-sm text-muted-foreground">{technician.profile?.city}, {technician.profile?.state} {technician.profile?.zip_code}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold">Work</h4>
                      <p className="text-sm text-muted-foreground">{technician.years_of_experience || 0} years experience</p>
                      <p className="text-sm text-muted-foreground">Specializations: {technician.specializations?.join(', ') || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">License: {technician.license_number || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Insurance: {technician.insurance_policy_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Audit</h4>
                    <p className="text-sm text-muted-foreground">Verification status: {technician.verification_status}</p>
                    {technician.verified_by_profile && <p className="text-sm text-muted-foreground">Verified by: {technician.verified_by_profile.full_name} ({technician.verified_by_profile.email})</p>}
                    {technician.verification_notes && <p className="text-sm text-muted-foreground">Notes: {technician.verification_notes}</p>}
                    <p className="text-sm text-muted-foreground">Active: {technician.is_active ? 'Yes' : 'No'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Additional info/cards could go here (jobs, reviews, bookings) */}
            </div>

            <div className="space-y-6">
              <AdminTechnicianActions initial={technician} />
            </div>
          </div>

            <div className='space-y-6'>
                <AdminTechnicianServices initial={techServices} />
            </div>
        </div>
      </main>
    </div>
  )
}