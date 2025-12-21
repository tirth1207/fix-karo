"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  calculateCompletionRateScore,
  calculateSLAScore,
  calculateWorkloadScore,
  calculateTotalRankingScore,
  generateAssignmentReason,
  type TechnicianRanking,
  type RankingFactors,
} from "@/lib/auto-assignment"
import { calculateRiskScore, calculateSkillMatchScore } from "@/lib/matching-engine"

export async function autoAssignTechnician(bookingId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      *,
      service:technician_services(
        service_id,
        service:services(category_id, emergency_supported)
      )
    `,
    )
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) return { error: "Booking not found" }

  // Get all technicians offering this service
  const { data: technicianServices } = await supabase
    .from("technician_services")
    .select(
      `
      *,
      technician:technician_profiles(
        id,
        rating,
        total_reviews,
        total_jobs_completed,
        verification_status,
        profile:profiles(full_name, city, state)
      )
    `,
    )
    .eq("service_id", booking.service?.service_id)
    .eq("is_active", true)
    .eq("approval_status", "approved")

  if (!technicianServices || technicianServices.length === 0) {
    return { error: "No available technicians for this service" }
  }

  // Filter verified technicians in same city/state
  const eligibleTechs = technicianServices.filter(
    (ts: any) =>
      ts.technician?.verification_status === "verified" &&
      ts.technician?.profile?.city === booking.service_city &&
      ts.technician?.profile?.state === booking.service_state,
  )

  if (eligibleTechs.length === 0) {
    return { error: "No verified technicians available in your area" }
  }

  // Get additional data for ranking
  const techIds = eligibleTechs.map((t: any) => t.technician_id)

  const [fraudMetricsResult, activeBookingsResult, completedBookingsResult, preferredResult] = await Promise.all([
    supabase.from("fraud_metrics").select("*").in("user_id", techIds).eq("threshold_exceeded", true),
    supabase
      .from("bookings")
      .select("technician_id")
      .in("technician_id", techIds)
      .in("status", ["pending", "confirmed", "in_progress"]),
    supabase
      .from("bookings")
      .select("technician_id, status, scheduled_date, actual_end_time")
      .in("technician_id", techIds),
    supabase.from("preferred_technicians").select("*").eq("customer_id", booking.customer_id),
  ])

  const fraudMetrics = fraudMetricsResult.data || []
  const activeBookings = activeBookingsResult.data || []
  const completedBookings = completedBookingsResult.data || []
  const preferredTechs = preferredResult.data || []

  // Calculate rankings
  const rankings: TechnicianRanking[] = eligibleTechs
    .map((ts: any) => {
      const techId = ts.technician_id
      const techFraudMetrics = fraudMetrics.filter((fm) => fm.user_id === techId)
      const techActiveBookings = activeBookings.filter((ab) => ab.technician_id === techId).length
      const techCompletedBookings = completedBookings.filter(
        (cb) => cb.technician_id === techId && cb.status === "completed",
      ).length
      const techCancelledBookings = completedBookings.filter(
        (cb) => cb.technician_id === techId && cb.status === "cancelled",
      ).length

      // Check if preferred
      const isPreferred = preferredTechs.some((pt) => pt.technician_id === techId)

      // Calculate SLA (simplified - check if completed within estimated time)
      const onTimeCompletions = completedBookings.filter((cb) => {
        if (cb.technician_id !== techId || cb.status !== "completed") return false
        // Simplified: assume on-time if completed
        return true
      }).length

      const riskScore = calculateRiskScore(techFraudMetrics)

      // Reject high-risk or suspended technicians
      if (riskScore > 70 || ts.technician?.verification_status === "suspended") {
        return null
      }

      const distanceScore = 85 // placeholder - in production, use real distance
      const skillMatchScore = calculateSkillMatchScore(
        ts.experience_level || "intermediate",
        techCompletedBookings,
        ts.technician?.rating || 0,
      )
      const completionRateScore = calculateCompletionRateScore(techCompletedBookings, techCancelledBookings)
      const slaHistoryScore = calculateSLAScore(onTimeCompletions, techCompletedBookings - onTimeCompletions)
      const workloadBalanceScore = calculateWorkloadScore(techActiveBookings)

      const factors: RankingFactors = {
        distance: 5, // km
        distanceScore,
        skillMatch: skillMatchScore,
        skillMatchScore,
        riskScore,
        riskPenalty: riskScore * 0.5,
        completionRate: completionRateScore,
        completionRateScore,
        slaHistory: slaHistoryScore,
        slaHistoryScore,
        workloadBalance: workloadBalanceScore,
        workloadBalanceScore,
        isPreferred,
        preferredBonus: isPreferred ? 20 : 0,
        totalScore: 0,
      }

      factors.totalScore = calculateTotalRankingScore(factors)

      const ranking: TechnicianRanking = {
        technicianId: techId,
        technicianServiceId: ts.id,
        technicianName: ts.technician?.profile?.full_name || "Unknown",
        rankingFactors: factors,
        reason: "",
      }

      ranking.reason = generateAssignmentReason(ranking)

      return ranking
    })
    .filter((r): r is TechnicianRanking => r !== null)
    .sort((a, b) => {
      // Preferred technicians first
      if (a.rankingFactors.isPreferred && !b.rankingFactors.isPreferred) return -1
      if (!a.rankingFactors.isPreferred && b.rankingFactors.isPreferred) return 1
      // Then by total score
      return b.rankingFactors.totalScore - a.rankingFactors.totalScore
    })

  if (rankings.length === 0) {
    return { error: "No suitable technicians available" }
  }

  const bestMatch = rankings[0]

  // Log assignment decision
  const { error: logError } = await supabase.from("assignment_logs").insert({
    booking_id: bookingId,
    assigned_technician_id: bestMatch.technicianId,
    assignment_type: "auto",
    ranking_factors: bestMatch.rankingFactors,
    reason: bestMatch.reason,
    assigned_by: null,
  })

  if (logError) {
    console.error("[v0] Failed to log assignment:", logError)
  }

  // Update booking with assigned technician
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      technician_id: bestMatch.technicianId,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (updateError) return { error: updateError.message }

  revalidatePath("/dashboard/customer")
  revalidatePath("/dashboard/technician")
  revalidatePath("/admin")

  return {
    success: true,
    assignedTechnician: bestMatch,
    allRankings: rankings, // for transparency
  }
}

export async function adminOverrideAssignment(bookingId: string, technicianId: string, reason: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    return { error: "Admin access required" }
  }

  // Log admin override
  const { error: logError } = await supabase.from("assignment_logs").insert({
    booking_id: bookingId,
    assigned_technician_id: technicianId,
    assignment_type: "manual_admin",
    ranking_factors: { manual_override: true },
    reason: `Admin override: ${reason}`,
    assigned_by: user.id,
  })

  if (logError) {
    console.error("[v0] Failed to log admin override:", logError)
  }

  // Update booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      technician_id: technicianId,
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (updateError) return { error: updateError.message }

  revalidatePath("/admin")
  return { success: true }
}

export async function getAssignmentLogs(bookingId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("assignment_logs")
    .select(
      `
      *,
      technician:technician_profiles(
        profile:profiles(full_name)
      ),
      assigned_by_user:profiles(full_name)
    `,
    )
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }

  return { logs: data }
}
