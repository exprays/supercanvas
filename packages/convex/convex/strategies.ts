// ─────────────────────────────────────────────
// SuperCanvas — Convex Strategy Mutations & Queries
// ─────────────────────────────────────────────

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Queries ──

/** Get a strategy by its external (PostgreSQL) ID */
export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategies")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

/** Get all strategies for a user */
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategies")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ── Mutations ──

/** Create or update a strategy's live state */
export const upsert = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    name: v.string(),
    dagJson: v.any(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("strategies")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dagJson: args.dagJson,
        version: args.version,
        name: args.name,
        lastEditedBy: args.userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("strategies", {
      externalId: args.externalId,
      userId: args.userId,
      name: args.name,
      dagJson: args.dagJson,
      version: args.version,
      lastEditedBy: args.userId,
    });
  },
});

/** Update the DAG JSON (live editing) */
export const updateDag = mutation({
  args: {
    id: v.id("strategies"),
    dagJson: v.any(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      dagJson: args.dagJson,
      lastEditedBy: args.userId,
    });
  },
});
