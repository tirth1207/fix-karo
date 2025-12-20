// Payment calculation utilities
export const PLATFORM_FEE_PERCENTAGE = 0.15 // 15% platform fee

export function calculatePaymentBreakdown(serviceAmount: number) {
  const amount = Number(serviceAmount)
  const platformFee = Number((amount * PLATFORM_FEE_PERCENTAGE).toFixed(2))
  const technicianPayout = Number((amount - platformFee).toFixed(2))

  return {
    amount,
    platformFee,
    technicianPayout,
  }
}

export type PaymentStatus = "pending" | "held_in_escrow" | "released" | "refunded"
