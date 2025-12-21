"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export function TechnicianOnboardingForm({ fullName }: { fullName?: string }) {
  const [businessName, setBusinessName] = useState("")
  const [specializations, setSpecializations] = useState("")
  const [years, setYears] = useState<number | "">(0)
  const [license, setLicense] = useState("")
  const [insurance, setInsurance] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Basic validation
    if (!Number.isFinite(Number(years)) || Number(years) < 0) {
      setError("Years of experience is required and must be 0 or greater")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/technician/profile/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || null,
          specializations: specializations ? specializations.split(",").map((s) => s.trim()) : [],
          years_of_experience: Number(years),
          license_number: license || null,
          insurance_policy_number: insurance || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Failed to create profile")
        setIsLoading(false)
        return
      }

      router.push("/dashboard/technician")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label className="block text-sm">Full name</label>
        <div className="w-full rounded-md border p-2 text-muted-foreground">{fullName || "(Not provided)"}</div>
      </div>

      <div>
        <label className="block text-sm">Business name (optional)</label>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} name="business_name" className="w-full rounded-md border p-2" />
      </div>

      <div>
        <label className="block text-sm">Specializations (optional, comma separated)</label>
        <input value={specializations} onChange={(e) => setSpecializations(e.target.value)} name="specializations" className="w-full rounded-md border p-2" />
      </div>

      <div>
        <label className="block text-sm">Years of experience</label>
        <input value={years as any} onChange={(e) => setYears(e.target.value === "" ? "" : Number(e.target.value))} name="years_of_experience" type="number" min={0} required className="w-full rounded-md border p-2" />
      </div>

      <div>
        <label className="block text-sm">License number (optional)</label>
        <input value={license} onChange={(e) => setLicense(e.target.value)} name="license_number" className="w-full rounded-md border p-2" />
      </div>

      <div>
        <label className="block text-sm">Insurance policy number (optional)</label>
        <input value={insurance} onChange={(e) => setInsurance(e.target.value)} name="insurance_policy_number" className="w-full rounded-md border p-2" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="pt-4">
        <button type="submit" disabled={isLoading} className="rounded bg-primary px-4 py-2 text-white">
          {isLoading ? "Completing..." : "Complete profile"}
        </button>
      </div>
    </form>
  )
}
