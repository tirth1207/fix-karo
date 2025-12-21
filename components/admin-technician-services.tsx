"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card'
import { Droplet, Flame, Hammer, Paintbrush, Settings, Sparkles, Wrench, Zap } from "lucide-react"
import { Badge } from "./ui/badge"
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
export function AdminTechnicianServices({ initial }: { initial: any }) {
  const [notes, setNotes] = useState(initial.verification_notes || "")
  const [suspensionReason, setSuspensionReason] = useState(initial.suspension_reason || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const id = initial.id
  const techServices = initial

  async function updateService(
    serviceId: string,
    action: "approve" | "reject"
    ) {
    if (isLoading) return

    setIsLoading(true)

    try {
        const res = await fetch(
        `/api/admin/technician-services/${serviceId}/update`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            action,
            rejection_reason:
                action === "reject" ? "Rejected by admin" : null,
            }),
        }
        )

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed")

        router.push("/admin/technicians")
        router.refresh()
    } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error")
    } finally {
        setIsLoading(false)
    }
    }



  return (
    <div className='mt-8'>
            <h2 className="mb-4 text-2xl font-bold">Services Offered</h2>
            {techServices && techServices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {techServices.map((service:any) => {
                    const Icon =
                        SERVICE_ICONS[service.service_id.category_id.icon_name] ?? Settings

                    return (
                        <Card key={service.id}>
                        <CardHeader>
                            <div className='flex justify-between'>
                                <div>
                                    <CardTitle className="text-lg">
                                        {service.service_id.name}
                                    </CardTitle>
                                     <CardDescription className="text-sm text-muted-foreground">
                                        Status: {service.approval_status}{" "}
                                        {service.is_active ? "(Active)" : "(Inactive)"}
                                    </CardDescription>
                                </div>
                                <div>
                                    <Badge className="flex w-fit items-center gap-1">
                                        <Icon className="h-3.5 w-3.5" />
                                        {service.service_id.category_id.name}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm">Price: ₹{service.custom_price}</p>
                            <p className="text-sm">
                            Coverage: {service.coverage_radius_km} km
                            </p>
                            <p className="text-sm">
                            Description: {service.service_id.description || "N/A"}
                            </p>
                        </CardContent>
                        <CardFooter className="flex justify-center gap-2">
                            <Button
                                className="w-2/3"
                                disabled={isLoading}
                                onClick={() => updateService(service.id, "approve")}
                            >
                                Approve
                            </Button>

                            <Button
                                variant="outline"
                                className="w-1/3"
                                disabled={isLoading}
                                onClick={() => updateService(service.id, "reject")}
                            >
                                Reject
                            </Button>
                            </CardFooter>
                        </Card>
                    )
                    })}

              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This technician has not added any services yet.</p>
            )}
          </div>
  )
}
