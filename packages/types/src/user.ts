// ─────────────────────────────────────────────
// SuperCanvas — User & Auth Types
// ─────────────────────────────────────────────

/** User subscription plan */
export type UserPlan = "free" | "pro" | "enterprise";

/** User profile synced from Clerk */
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  plan: UserPlan;
  creditsRemaining: number;
  createdAt: string;
  updatedAt: string;
}

/** Credit tier limits */
export const PLAN_CREDITS: Record<UserPlan, number> = {
  free: 100,
  pro: 5000,
  enterprise: -1, // unlimited
};
