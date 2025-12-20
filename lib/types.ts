export type UserRole = "customer" | "technician" | "admin"

export type Profile = {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  created_at: string
  updated_at: string
}

export type TechnicianProfile = {
  id: string
  business_name: string | null
  specializations: string[]
  years_of_experience: number | null
  license_number: string | null
  insurance_policy_number: string | null
  verification_status: "pending" | "verified" | "rejected" | "suspended"
  verification_notes: string | null
  verified_at: string | null
  verified_by: string | null
  rating: number
  total_reviews: number
  total_jobs_completed: number
  background_check_completed: boolean
  background_check_date: string | null
  is_active: boolean
  suspended_at: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
}
