// ─────────────────────────────────────────────
// SuperCanvas — Convex Presence Mutations & Queries
// Real-time user presence on the strategy canvas
// ─────────────────────────────────────────────

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PRESENCE_TIMEOUT = 30_000; // 30 seconds

/** Get all active users on a strategy canvas */
export const getPresence = query({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const presenceList = await ctx.db
      .query("presence")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .collect();

    // Filter out stale presence entries
    return presenceList.filter((p) => now - p.lastSeen < PRESENCE_TIMEOUT);
  },
});

/** Update user presence (heartbeat) */
export const updatePresence = mutation({
  args: {
    strategyId: v.id("strategies"),
    userId: v.string(),
    userName: v.string(),
    userColor: v.string(),
    cursorPosition: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const data = {
      strategyId: args.strategyId,
      userId: args.userId,
      userName: args.userName,
      userColor: args.userColor,
      cursorPosition: args.cursorPosition,
      lastSeen: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("presence", data);
    }
  },
});

/** Remove user presence (on disconnect) */
export const removePresence = mutation({
  args: {
    strategyId: v.id("strategies"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
