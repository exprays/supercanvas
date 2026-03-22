// ─────────────────────────────────────────────
// SuperCanvas — User Router
// Procedures for user profile and plan management
// ─────────────────────────────────────────────

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc/trpc";
import { users } from "@supercanvas/db";

export const userRouter = router({
  /**
   * Get the current user's profile from PostgreSQL.
   * Source of truth for plan, credits, etc.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(users)
      .where(eq(users.clerkId, ctx.userId))
      .limit(1);

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found in database. Webhook may not have fired yet.",
      });
    }

    return result[0];
  }),

  /**
   * Get remaining backtest credits for the current user.
   */
  credits: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ creditsRemaining: users.creditsRemaining, plan: users.plan })
      .from(users)
      .where(eq(users.clerkId, ctx.userId))
      .limit(1);

    if (result.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    return result[0];
  }),
});
