// Service Discovery & Matching Engine
// Finds available technicians based on location, service, and risk thresholds

export type MatchingCriteria = {
  serviceId?: string
  categoryId?: string
  customerCity: string
  customerState: string
  customerLocation?: { lat: number; lng: number }
  emergencyFlag?: boolean
  preferredTechnicianId?: string
  customerLatitude?: number
  customerLongitude?: number
}

export type TechnicianMatch = {
  technicianId: string
  technicianServiceId: string
  technicianName: string
  businessName: string
  rating: number
  totalReviews: number
  customPrice: number
  estimatedDistance: number
  availabilityScore: number
  skillMatchScore: number
  riskScore: number
  confidenceScore: number
  experienceLevel: string
  estimatedETA: string
  warranty: number
  isPreferred: boolean
}

// Calculate distance between two points (simplified Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate ETA based on distance
export function calculateETA(distanceKm: number): string {
  const baseSpeed = 40 // km/h average speed
  const hours = distanceKm / baseSpeed
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`
  }
  return `${hours.toFixed(1)} hours`
}

// Calculate availability score (0-100)
export function calculateAvailabilityScore(activeBookings: number, completedBookings: number): number {
  // Lower active bookings = higher availability
  const activeScore = Math.max(0, 100 - activeBookings * 10)
  // More completed bookings = more reliable
  const experienceBonus = Math.min(20, completedBookings * 2)
  return Math.min(100, activeScore + experienceBonus)
}

// Calculate skill match score (0-100)
export function calculateSkillMatchScore(experienceLevel: string, totalCompleted: number, rating: number): number {
  let score = 50 // base score

  // Experience level bonus
  if (experienceLevel === "expert") score += 30
  else if (experienceLevel === "intermediate") score += 20
  else if (experienceLevel === "beginner") score += 10

  // Completion bonus
  score += Math.min(20, totalCompleted)

  // Rating bonus
  score += (rating / 5) * 20

  return Math.min(100, score)
}

// Calculate risk score (0-100, lower is better)
export function calculateRiskScore(fraudMetrics: any[]): number {
  if (!fraudMetrics || fraudMetrics.length === 0) return 0

  let riskScore = 0

  fraudMetrics.forEach((metric) => {
    if (metric.metric_type === "rapid_cancellations" && metric.threshold_exceeded) {
      riskScore += 30
    }
    if (metric.metric_type === "payment_disputes" && metric.threshold_exceeded) {
      riskScore += 40
    }
    if (metric.metric_type === "fake_completion" && metric.threshold_exceeded) {
      riskScore += 50
    }
  })

  return Math.min(100, riskScore)
}

// Calculate overall confidence score (0-100)
export function calculateConfidenceScore(
  availabilityScore: number,
  skillMatchScore: number,
  riskScore: number,
  distanceKm: number,
  coverageRadius: number,
): number {
  // Penalize if outside coverage or far away
  const distancePenalty = distanceKm > coverageRadius ? 50 : (distanceKm / coverageRadius) * 20

  const confidence = availabilityScore * 0.3 + skillMatchScore * 0.4 + (100 - riskScore) * 0.3 - distancePenalty

  return Math.max(0, Math.min(100, confidence))
}
