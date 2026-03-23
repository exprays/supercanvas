// ─────────────────────────────────────────────
// SuperCanvas — Convex Presence Mutations & Queries
// Real-time user presence on the strategy canvas
// ─────────────────────────────────────────────

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PRESENCE_TIMEOUT = 30_000; // 30 seconds
const LOCK_TIMEOUT = 20_000; // 20 seconds

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

/**
 * Get node locks for a strategy (stale locks are filtered out).
 * Used to disable editing/connecting when other users are interacting with a node.
 */
export const getNodeLocks = query({
  args: { strategyId: v.id("strategies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const locks = await ctx.db
      .query("nodeLocks")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .collect();

    return locks
      .filter((l) => now - l.lockedAt < LOCK_TIMEOUT)
      .map((l) => ({ nodeId: l.nodeId, lockedBy: l.lockedBy }));
  },
});

/**
 * Acquire a temporary lock for a node (typically on mousedown).
 * If the node is locked by another user, acquisition fails.
 */
export const acquireNodeLock = mutation({
  args: {
    strategyId: v.id("strategies"),
    nodeId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("nodeLocks")
      .withIndex("by_node", (q) =>
        q.eq("strategyId", args.strategyId).eq("nodeId", args.nodeId)
      )
      .first();

    if (existing) {
      const isStale = now - existing.lockedAt >= LOCK_TIMEOUT;
      const lockedByOther = existing.lockedBy !== args.userId;
      if (!isStale && lockedByOther) {
        return { success: false, lockedBy: existing.lockedBy };
      }

      await ctx.db.patch(existing._id, {
        lockedBy: args.userId,
        lockedAt: now,
      });
      return { success: true };
    }

    await ctx.db.insert("nodeLocks", {
      strategyId: args.strategyId,
      nodeId: args.nodeId,
      lockedBy: args.userId,
      lockedAt: now,
    });

    return { success: true };
  },
});

/**
 * Release a node lock (typically on mouseup / blur).
 */
export const releaseNodeLock = mutation({
  args: {
    strategyId: v.id("strategies"),
    nodeId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nodeLocks")
      .withIndex("by_node", (q) =>
        q.eq("strategyId", args.strategyId).eq("nodeId", args.nodeId)
      )
      .first();

    if (!existing) return { success: true };
    if (existing.lockedBy !== args.userId) return { success: false };

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});
