"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TechnicianProfileEditor({ initial }: { initial: any }) {
  const [businessName, setBusinessName] = useState(initial.business_name || "")
  const [specializations, setSpecializations] = useState((initial.specializations || []).join(", "))
  const [years, setYears] = useState<number | "">(initial.years_of_experience ?? "")
  const [license, setLicense] = useState(initial.license_number || "")
  const [insurance, setInsurance] = useState(initial.insurance_policy_number || "")

  // Profile (contact/location) fields
  const [fullName, setFullName] = useState(initial.profile?.full_name || "")
  const [city, setCity] = useState(initial.profile?.city || "")
  const [state, setState] = useState(initial.profile?.state || "")
  const [zipCode, setZipCode] = useState(initial.profile?.zip_code || "")
  const [phone, setPhone] = useState(initial.profile?.phone || "")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!Number.isFinite(Number(years)) && years !== "") {
      setError("Years of experience must be a number")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/technician/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || null,
          specializations: specializations ? specializations.split(",").map((s) => s.trim()) : [],
          years_of_experience: years === "" ? null : Number(years),
          license_number: license || null,
          insurance_policy_number: insurance || null,

          // Profile fields
          full_name: fullName || null,
          city: city || null,
          state: state || null,
          zip_code: zipCode || null,
          phone: phone || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to update profile")
        setIsLoading(false)
        return
      }

      // Refresh server props
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <Label>Business name</Label>
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>

      <div>
        <Label>Specializations (comma separated)</Label>
        <Input value={specializations} onChange={(e) => setSpecializations(e.target.value)} />
      </div>

      <div>
        <Label>Years of experience</Label>
        <Input type="number" value={years as any} onChange={(e) => setYears(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>

      <div>
        <Label>License number</Label>
        <Input value={license} onChange={(e) => setLicense(e.target.value)} />
      </div>

      <div>
        <Label>Insurance policy number</Label>
        <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} />
      </div>

      <hr className="my-4" />

      <div>
        <Label>Full name</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div>
        <Label>City</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      <div>
        <Label>State</Label>
        <Input value={state} onChange={(e) => setState(e.target.value)} />
      </div>

      <div>
        <Label>Zip code</Label>
        <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
      </div>

      <div>
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save changes"}</Button>
      </div>
    </form>
  )
}
