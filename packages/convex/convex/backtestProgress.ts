// ─────────────────────────────────────────────
// SuperCanvas — Convex Backtest Progress
// Streams real-time backtest progress to the frontend
// ─────────────────────────────────────────────

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Get backtest progress by external backtest ID */
export const getProgress = query({
  args: { externalBacktestId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("backtestProgress")
      .withIndex("by_backtest_id", (q) =>
        q.eq("externalBacktestId", args.externalBacktestId)
      )
      .first();
  },
});

/** Get all active backtests for a user */
export const getActiveByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("backtestProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return all.filter(
      (b) => b.status === "running" || b.status === "queued"
    );
  },
});

/** Create or update backtest progress */
export const updateProgress = mutation({
  args: {
    externalBacktestId: v.string(),
    userId: v.string(),
    strategyId: v.string(),
    status: v.string(),
    progress: v.number(),
    currentDate: v.optional(v.string()),
    partialEquityCurve: v.optional(v.array(v.object({
      timestamp: v.string(),
      equity: v.number(),
    }))),
    metricsSnapshot: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("backtestProgress")
      .withIndex("by_backtest_id", (q) =>
        q.eq("externalBacktestId", args.externalBacktestId)
      )
      .first();

    const data = {
      externalBacktestId: args.externalBacktestId,
      userId: args.userId,
      strategyId: args.strategyId,
      status: args.status,
      progress: args.progress,
      currentDate: args.currentDate,
      partialEquityCurve: args.partialEquityCurve,
      metricsSnapshot: args.metricsSnapshot,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("backtestProgress", data);
    }
  },
});
