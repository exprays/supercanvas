// ─────────────────────────────────────────────
// SuperCanvas — User Router
// Procedures for user profile and plan management
// ─────────────────────────────────────────────

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
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
      try {
        // Fallback: Webhook didn't fire (common in local dev without ngrok).
        // Let's manually sync the user from Clerk's API as a safeguard.
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(ctx.userId);

        const email = clerkUser.emailAddresses[0]?.emailAddress || "";

        await ctx.db.insert(users).values({
          clerkId: clerkUser.id,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          plan: "free",
          creditsRemaining: 100,
        });

        // Fetch freshly inserted user
        const newResult = await ctx.db
          .select()
          .from(users)
          .where(eq(users.clerkId, ctx.userId))
          .limit(1);

        return newResult[0];
      } catch (e) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database and fallback Clerk sync failed.",
        });
      }
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
