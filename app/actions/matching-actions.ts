"use server"

import { calculateHaversineDistance } from "@/lib/geo/haversine"
import { createServerClient } from "@/lib/supabase/server"
import {
  calculateAvailabilityScore,
  calculateSkillMatchScore,
  calculateRiskScore,
  calculateConfidenceScore,
  calculateETA,
  type TechnicianMatch,
  type MatchingCriteria,
} from "@/lib/matching-engine"

export async function findAvailableServices(criteria: MatchingCriteria) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Build query based on criteria
  let query = supabase
    .from("technician_services")
    .select(
      `
      id,
      technician_id,
      service_id,
      custom_price,
      coverage_radius_km,
      experience_level,
      is_active,
      service:services(
        id,
        name,
        description,
        base_price,
        estimated_duration_minutes,
        warranty_days,
        emergency_supported,
        category:service_categories(name)
      ),
      technician:technician_profiles(
        id,
        rating,
        total_reviews,
        total_jobs_completed,
        verification_status,
        profile:profiles!technician_profiles_id_fkey(full_name, city, state, latitude, longitude)
      )
    `,
    )
    .eq("is_active", true)
    .eq("approval_status", "approved")

  if (criteria.serviceId) {
    query = query.eq("service_id", criteria.serviceId)
  }

  if (criteria.emergencyFlag) {
    // Filter to emergency-supported services only
    query = query.eq("service.emergency_supported", true)
  }

  const { data: technicianServices, error } = await query
  console.log("technicianServices", technicianServices)
  console.log("error", error)
  if (error) return { error: error.message }
  if (!technicianServices) return { matches: [] }

  // Filter by city/state and verified technicians
  const filtered = technicianServices.filter((ts: any) => {
    const isVerified = ts.technician?.verification_status === "verified"
    const techCity = ts.technician?.profile?.city?.trim().toLowerCase()
    const custCity = criteria.customerCity?.trim().toLowerCase()
    const techState = ts.technician?.profile?.state?.trim().toLowerCase()
    const custState = criteria.customerState?.trim().toLowerCase()

    const cityMatch = !custCity || techCity === custCity
    const stateMatch = !custState || techState === custState

    if (!isVerified || !cityMatch || !stateMatch) {
      console.log(`[Matching] Filtered out tech ${ts.technician_id}:`, {
        isVerified,
        techCity,
        custCity,
        cityMatch,
        techState,
        custState,
        stateMatch,
      })
    }

    return isVerified && cityMatch && stateMatch
  })

  // Get fraud metrics for risk scoring
  const technicianIds = filtered.map((ts: any) => ts.technician_id)
  const { data: fraudMetrics } = await supabase
    .from("fraud_metrics")
    .select("*")
    .in("user_id", technicianIds)
    .eq("threshold_exceeded", true)

  // Get active bookings for availability scoring
  const { data: activeBookings } = await supabase
    .from("bookings")
    .select("technician_id")
    .in("technician_id", technicianIds)
    .in("status", ["pending", "confirmed", "in_progress"])

  // Check for preferred technician relationship
  const { data: preferredTechs } = await supabase
    .from("preferred_technicians")
    .select("technician_id, total_bookings")
    .eq("customer_id", user.id)

  // Calculate scores and build matches
  const matches: TechnicianMatch[] = filtered
    .map((ts: any) => {
      const technicianFraudMetrics = fraudMetrics?.filter((fm: any) => fm.user_id === ts.technician_id) || []
      const activeBkgCount = activeBookings?.filter((ab: any) => ab.technician_id === ts.technician_id).length || 0
      const isPreferred = preferredTechs?.some((pt: any) => pt.technician_id === ts.technician_id) || false

      const riskScore = calculateRiskScore(technicianFraudMetrics)
      const availabilityScore = calculateAvailabilityScore(activeBkgCount, ts.technician?.total_jobs_completed || 0)
      const skillMatchScore = calculateSkillMatchScore(
        ts.experience_level || "intermediate",
        ts.technician?.total_jobs_completed || 0,
        ts.technician?.rating || 0,
      )

      // Use actual coordinates for distance
      const techLatVal = ts.technician?.profile?.latitude
      const techLngVal = ts.technician?.profile?.longitude
      const custLatVal = criteria.customerLatitude
      const custLngVal = criteria.customerLongitude

      const hasTechCoords = techLatVal !== null && techLatVal !== undefined && Number(techLatVal) !== 0
      const hasCustCoords = custLatVal !== null && custLatVal !== undefined && Number(custLatVal) !== 0

      if (!hasTechCoords || !hasCustCoords) {
        console.log(`[Matching] Coordinate missing for tech ${ts.technician_id}:`, {
          techLatVal, techLngVal, hasTechCoords,
          custLatVal, custLngVal, hasCustCoords
        })
      }
      console.log("critiria", criteria)
      // Fallback safety: if any coordinate missing, use a placeholder 0 (as user requested)
      const estimatedDistance =
        hasTechCoords && hasCustCoords
          ? calculateHaversineDistance(Number(custLatVal), Number(custLngVal), Number(techLatVal), Number(techLngVal))
          : 0

      // Round to 2 decimals if it was calculated
      const finalDistance = Number(estimatedDistance.toFixed(2));

      const confidenceScore = calculateConfidenceScore(
        availabilityScore,
        skillMatchScore,
        riskScore,
        finalDistance,
        ts.coverage_radius_km,
      )

      return {
        technicianId: ts.technician_id,
        technicianServiceId: ts.id,
        technicianName: ts.technician?.profile?.full_name || "Unknown",
        businessName: ts.technician?.business_name || "",
        rating: ts.technician?.rating || 0,
        totalReviews: ts.technician?.total_reviews || 0,
        customPrice: ts.custom_price,
        estimatedDistance: finalDistance,
        availabilityScore,
        skillMatchScore,
        riskScore,
        confidenceScore,
        experienceLevel: ts.experience_level || "intermediate",
        estimatedETA: calculateETA(finalDistance),
        warranty: ts.service?.warranty_days || 0,
        isPreferred,
        coverage_radius_km: ts.coverage_radius_km
      }
    })
    .filter((match: any) => {
      // Filter out high-risk technicians
      if (match.riskScore > 70) return false

      // Filter out if outside coverage radius defined by technician
      // We use the coverage_radius_km from the technician_service record
      const maxRadius = match.coverage_radius_km || 50;
      if (match.estimatedDistance > maxRadius) {
        console.log(`[Matching] Filtered out tech ${match.technicianId} due to distance: ${match.estimatedDistance}km > ${maxRadius}km`)
        return false
      }

      return true
    })
    .sort((a: any, b: any) => {
      // Preferred technicians first
      if (a.isPreferred && !b.isPreferred) return -1
      if (!a.isPreferred && b.isPreferred) return 1
      // Then by confidence score
      return b.confidenceScore - a.confidenceScore
    })
  console.log("matches", matches)
  return { matches, totalFound: matches.length }
}

export async function searchServicesByCategory(categoryId: string, city: string, state: string) {
  const supabase = await createServerClient()

  const { data: services } = await supabase
    .from("services")
    .select(
      `
      *,
      category:service_categories(name, icon_name)
    `,
    )
    .eq("category_id", categoryId)
    .eq("is_active", true)
  console.log("services", services)

  // Check city availability
  const { data: cityAvailability } = await supabase
    .from("service_city_availability")
    .select("service_id")
    .in("service_id", services?.map((s: any) => s.id) || [])
    .eq("city", city)
    .eq("state", state)
    .eq("is_enabled", true)
  console.log("cityAvailability", cityAvailability)

  const availableServiceIds = cityAvailability?.map((ca: any) => ca.service_id) || []
  const availableServices = services?.filter((s: any) => availableServiceIds.includes(s.id)) || []

  return { services: availableServices }
}
