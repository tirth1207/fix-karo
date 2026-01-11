export type RankingFactors = {
  distance: number
  distanceScore: number
  skillMatch: number
  skillMatchScore: number
  riskScore: number
  riskPenalty: number
  completionRate: number
  completionRateScore: number
  slaHistory: number
  slaHistoryScore: number
  workloadBalance: number
  workloadBalanceScore: number
  totalScore: number
  isPreferred: boolean
  preferredBonus: number
}

export type TechnicianRanking = {
  technicianId: string
  technicianServiceId: string
  technicianName: string
  customPrice?: number
  rankingFactors: RankingFactors
  reason: string
}

// Calculate completion rate score (0-100)
export function calculateCompletionRateScore(completed: number, cancelled: number): number {
  const total = completed + cancelled
  if (total === 0) return 50 // neutral for new technicians

  const rate = completed / total
  return rate * 100
}

// Calculate SLA history score (0-100)
export function calculateSLAScore(onTimeCompletions: number, lateCompletions: number): number {
  const total = onTimeCompletions + lateCompletions
  if (total === 0) return 50 // neutral

  const slaRate = onTimeCompletions / total
  return slaRate * 100
}

// Calculate workload balance score (0-100)
export function calculateWorkloadScore(activeBookings: number, capacity = 5): number {
  if (activeBookings >= capacity) return 0 // fully booked
  return ((capacity - activeBookings) / capacity) * 100
}

// Calculate total ranking score
export function calculateTotalRankingScore(factors: Partial<RankingFactors>): number {
  const weights = {
    distance: 0.25,
    skillMatch: 0.2,
    risk: 0.15,
    completionRate: 0.15,
    slaHistory: 0.15,
    workloadBalance: 0.1,
  }

  let score = 0
  score += (factors.distanceScore || 0) * weights.distance
  score += (factors.skillMatchScore || 0) * weights.skillMatch
  score += (100 - (factors.riskScore || 0)) * weights.risk // invert risk
  score += (factors.completionRateScore || 0) * weights.completionRate
  score += (factors.slaHistoryScore || 0) * weights.slaHistory
  score += (factors.workloadBalanceScore || 0) * weights.workloadBalance

  // Add preferred technician bonus
  if (factors.isPreferred) {
    score += factors.preferredBonus || 20
  }

  return Math.min(100, score)
}

// Generate human-readable reason
export function generateAssignmentReason(ranking: TechnicianRanking): string {
  const reasons: string[] = []

  if (ranking.rankingFactors.isPreferred) {
    reasons.push("customer's preferred technician")
  }

  if (ranking.rankingFactors.distanceScore > 80) {
    reasons.push("closest available")
  }

  if (ranking.rankingFactors.skillMatchScore > 85) {
    reasons.push("highly skilled match")
  }

  if (ranking.rankingFactors.completionRateScore > 90) {
    reasons.push("excellent completion rate")
  }

  if (ranking.rankingFactors.slaHistoryScore > 90) {
    reasons.push("strong SLA history")
  }

  if (ranking.rankingFactors.workloadBalanceScore > 80) {
    reasons.push("good availability")
  }

  if (reasons.length === 0) {
    return "Best available technician based on overall ranking"
  }

  return reasons.slice(0, 3).join(", ")
}
