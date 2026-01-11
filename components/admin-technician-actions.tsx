"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export function AdminTechnicianActions({ initial }: { initial: any }) {
  const [notes, setNotes] = useState(initial.verification_notes || "")
  const [suspensionReason, setSuspensionReason] = useState(initial.suspension_reason || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const id = initial.id

  async function update(payload: any) {
    if (isLoading) return
    if (!id) {
        alert("Invalid technician record")
        return
    }
    setIsLoading(true)

    try {
        const res = await fetch(`/api/admin/technicians/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed")

        // ✅ Always redirect after success
        router.push("/admin/technicians")
        router.refresh()
    } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error")
    } finally {
        setIsLoading(false)
    }
    }


  return (
    <div className="rounded-md border p-4">
      <h3 className="text-lg font-semibold">Admin actions</h3>

      <div className="mt-4 grid gap-2">
        <div>
          <Label>Verification notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button disabled={isLoading} onClick={() => update({ verification_status: "verified", verification_notes: notes })}>
            Approve
          </Button>
          <Button disabled={isLoading} onClick={() => update({ verification_status: "rejected", verification_notes: notes })}>
            Reject
          </Button>
        </div>

        <hr className="my-2" />

        <div>
          <Label>Suspension reason</Label>
          <Input value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button disabled={isLoading} onClick={() => update({ is_active: false, suspension_reason: suspensionReason })}>
            Suspend
          </Button>
          <Button disabled={isLoading} onClick={() => update({ is_active: true, suspension_reason: null })}>
            Unsuspend
          </Button>
        </div>
      </div>
    </div>
  )
}
