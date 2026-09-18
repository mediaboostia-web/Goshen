// Free-tier entitlements: 1 branch (the main one, created at signup), no
// team beyond the pastor, and 1 archived invoice PDF per calendar month.
// Matches the marketing copy on /subscription ("Plan Essentiel: jusqu'à 3
// annexes, 10 utilisateurs, Rapports PDF illimités" / "Plan Premium:
// jusqu'à 10 annexes, illimité") — FREE isn't sold there because it's the
// default state before subscribing, not a purchasable tier.
export const PLAN_LIMITS = {
  FREE: { maxBranches: 1, maxUsers: 1, maxInvoicesPerMonth: 1 },
  ESSENTIAL: { maxBranches: 3, maxUsers: 10, maxInvoicesPerMonth: Infinity },
  PREMIUM: { maxBranches: 10, maxUsers: Infinity, maxInvoicesPerMonth: Infinity },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function planLimitsFor(plan: string): (typeof PLAN_LIMITS)[PlanName] {
  return PLAN_LIMITS[plan as PlanName] ?? PLAN_LIMITS.FREE;
}
