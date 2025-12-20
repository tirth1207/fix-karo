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

export type ServiceCategory = {
  id: string
  name: string
  description: string | null
  icon_name: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type Service = {
  id: string
  category_id: string
  name: string
  description: string
  base_price: number
  min_price: number
  max_price: number
  estimated_duration_minutes: number
  warranty_days: number
  emergency_supported: boolean
  is_active: boolean
  version: number
  previous_version_id: string | null
  has_bookings: boolean
  created_at: string
  updated_at: string
}

export type ServiceCityAvailability = {
  id: string
  service_id: string
  city: string
  state: string
  is_enabled: boolean
  created_at: string
}

export type TechnicianService = {
  id: string
  technician_id: string
  service_id: string
  custom_price: number
  coverage_radius_km: number
  is_active: boolean
  approval_status: "pending" | "approved" | "rejected"
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  experience_level: "beginner" | "intermediate" | "expert" | null
  tools_declared: any
  created_at: string
  updated_at: string
}

export type PriceAuditLog = {
  id: string
  booking_id: string
  service_id: string
  platform_price: number
  technician_quoted_price: number
  final_charged_price: number
  price_variance_percent: number
  is_suspicious: boolean
  payment_method: string | null
  dispute_filed: boolean
  created_at: string
}

export type PreferredTechnician = {
  id: string
  customer_id: string
  technician_id: string
  service_id: string
  last_booking_id: string | null
  total_bookings: number
  offline_contact_suspected: boolean
  created_at: string
  updated_at: string
}
