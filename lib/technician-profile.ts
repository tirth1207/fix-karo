import { createClient } from "./supabase/server"

export type CreateTechnicianProfileData = {
  id: string // same as profiles.id
  business_name?: string | null
  specializations?: string[]
  years_of_experience?: number | null
  license_number?: string | null
  insurance_policy_number?: string | null
}

export async function checkTechnicianProfile(userId: string) {
  const supabase = await createClient()

  try {
    // Uses the DB function to determine existence + role checks server-side
    const { data, error } = await supabase.rpc("ensure_technician_profile", { p_user_id: userId })

    if (error) {
      console.error("checkTechnicianProfile rpc error:", error)
      throw error
    }

    // Postgres boolean returned as data: true/false
    return (data as unknown) as boolean
  } catch (err) {
    throw err
  }
}

export async function createTechnicianProfile(data: CreateTechnicianProfileData) {
  const supabase = await createClient()

  // Use an RPC that validates the caller and inserts the row as a SECURITY DEFINER function
  // This avoids RLS insert failures while still enforcing that only the user themselves
  // (and only if their profile role = 'technician') can create a technician_profiles row.
  const { data: inserted, error } = await supabase.rpc("create_technician_profile_if_allowed", {
    p_user_id: data.id,
    p_business_name: data.business_name || null,
    p_specializations: data.specializations || [],
    p_years_of_experience: data.years_of_experience ?? null,
    p_license_number: data.license_number || null,
    p_insurance_policy_number: data.insurance_policy_number || null,
  })

  if (error) {
    console.error("createTechnicianProfile rpc error:", error)
    throw error
  }

  return inserted as any
}
