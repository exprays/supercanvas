// ─────────────────────────────────────────────
// SuperCanvas — Backtest Router (tRPC)
// Submit, track, list, and cancel backtests
// ─────────────────────────────────────────────

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc/trpc";
import {
  backtests,
  strategies,
  users,
} from "@supercanvas/db";
import { inngest } from "@supercanvas/inngest-fns";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";

// ── Validation Schemas ──────────────────────────────────────────────────────

const slippageSchema = z.object({
  type: z.enum(["fixed", "percentage", "market_impact"]),
  value: z.number().min(0),
});

const feeScheduleSchema = z.object({
  makerFee: z.number().min(0).max(1),
  takerFee: z.number().min(0).max(1),
});

const backtestConfigSchema = z.object({
  symbols: z.array(z.string()).min(1).max(10),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resolution: z.enum(["daily", "minute"]),
  initialCapital: z.number().min(100).max(100_000_000),
  currency: z.string().default("USD"),
  slippage: slippageSchema.optional().default({ type: "percentage", value: 0.1 }),
  fees: feeScheduleSchema.optional().default({ makerFee: 0.001, takerFee: 0.002 }),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function resolveUserId(db: any, clerkId: string): Promise<string> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!result.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found. Sign out and sign back in.",
    });
  }
  return result[0].id;
}

function computeConfigHash(strategyId: string, dagJson: any, config: any): string {
  const payload = JSON.stringify({ strategyId, dagJson, config }, Object.keys({ strategyId, dagJson, config }).sort());
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

function estimateCredits(config: z.infer<typeof backtestConfigSchema>): number {
  const daysApprox = Math.ceil(
    (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const base = config.resolution === "minute" ? daysApprox * 5 : daysApprox;
  return Math.max(1, Math.ceil(base * config.symbols.length / 10));
}

// ── Router ──────────────────────────────────────────────────────────────────

export const backtestRouter = router({
  /**
   * Submit a new backtest. Validates ownership, computes config hash,
   * deducts credits, inserts into DB, and triggers Inngest pipeline.
   */
  submit: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().uuid(),
        config: backtestConfigSchema,
        versionMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      // Verify strategy ownership
      const [strategy] = await ctx.db
        .select({ id: strategies.id, dagJson: strategies.dagJson })
        .from(strategies)
        .where(and(eq(strategies.id, input.strategyId), eq(strategies.userId, userId)))
        .limit(1);

      if (!strategy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found." });
      }

      // Config hash for idempotency
      const configHash = computeConfigHash(
        input.strategyId,
        strategy.dagJson,
        input.config
      );

      // Check for existing identical backtest
      const existing = await ctx.db
        .select({ id: backtests.id, status: backtests.status })
        .from(backtests)
        .where(eq(backtests.configHash, configHash))
        .limit(1);

      if (existing.length > 0 && existing[0].status === "completed") {
        return { backtestId: existing[0].id, cached: true };
      }

      // Estimate credits
      const creditsNeeded = estimateCredits(input.config);

      // Check user credits
      const [user] = await ctx.db
        .select({ creditsRemaining: users.creditsRemaining })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.creditsRemaining < creditsNeeded && user.creditsRemaining !== -1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Insufficient credits. Need ${creditsNeeded}, have ${user.creditsRemaining}.`,
        });
      }

      // Insert backtest record
      const [backtest] = await ctx.db
        .insert(backtests)
        .values({
          strategyId: input.strategyId,
          userId,
          configJson: input.config,
          configHash,
          dagSnapshot: strategy.dagJson,
          status: "queued",
          resolution: input.config.resolution,
          creditsUsed: creditsNeeded,
        })
        .returning();

      // Deduct credits
      if (user.creditsRemaining !== -1) {
        await ctx.db
          .update(users)
          .set({ creditsRemaining: user.creditsRemaining - creditsNeeded })
          .where(eq(users.id, userId));
      }

      // Trigger Inngest backtest pipeline
      try {
        await inngest.send({
          name: "supercanvas/backtest.submitted",
          data: {
            backtestId: backtest.id,
            strategyId: input.strategyId,
            dagJson: strategy.dagJson,
            config: input.config,
            userId,
          },
        });
      } catch (err) {
        Sentry.captureException(err, { tags: { context: "inngest.backtest.submitted" } });
        // Update status to failed
        await ctx.db
          .update(backtests)
          .set({ status: "failed" })
          .where(eq(backtests.id, backtest.id));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to queue backtest.",
        });
      }

      return { backtestId: backtest.id, cached: false, creditsUsed: creditsNeeded };
    }),

  /**
   * Get a single backtest with full detail.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const [bt] = await ctx.db
        .select()
        .from(backtests)
        .where(and(eq(backtests.id, input.id), eq(backtests.userId, userId)))
        .limit(1);

      if (!bt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backtest not found." });
      }

      return bt;
    }),

  /**
   * List all backtests for the current user, paginated.
   */
  list: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      let query = ctx.db
        .select({
          id: backtests.id,
          strategyId: backtests.strategyId,
          status: backtests.status,
          resolution: backtests.resolution,
          metricsJson: backtests.metricsJson,
          configJson: backtests.configJson,
          creditsUsed: backtests.creditsUsed,
          createdAt: backtests.createdAt,
          completedAt: backtests.completedAt,
        })
        .from(backtests)
        .where(eq(backtests.userId, userId))
        .orderBy(desc(backtests.createdAt))
        .limit(input.limit + 1); // +1 for cursor

      const rows = await query;

      let nextCursor: string | undefined;
      if (rows.length > input.limit) {
        const next = rows.pop()!;
        nextCursor = next.id;
      }

      return { backtests: rows, nextCursor };
    }),

  /**
   * Cancel a running or queued backtest.
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.db, ctx.userId);

      const [bt] = await ctx.db
        .select({ id: backtests.id, status: backtests.status })
        .from(backtests)
        .where(and(eq(backtests.id, input.id), eq(backtests.userId, userId)))
        .limit(1);

      if (!bt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Backtest not found." });
      }

      if (bt.status !== "queued" && bt.status !== "running") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot cancel a ${bt.status} backtest.`,
        });
      }

      await ctx.db
        .update(backtests)
        .set({ status: "cancelled" })
        .where(eq(backtests.id, input.id));

      return { id: bt.id, status: "cancelled" };
    }),

  /**
   * Estimate credits for a given config (no side effects).
   */
  estimateCredits: protectedProcedure
    .input(z.object({ config: backtestConfigSchema }))
    .query(({ input }) => {
      return { credits: estimateCredits(input.config) };
    }),
});
