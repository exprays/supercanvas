// ─────────────────────────────────────────────
// SuperCanvas — Convex Schema
// Real-time data model for live collaboration and backtest streaming
// ─────────────────────────────────────────────

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Live strategy state for real-time collaboration
  strategies: defineTable({
    externalId: v.string(), // Maps to PostgreSQL strategy ID
    userId: v.string(),
    name: v.string(),
    dagJson: v.any(), // Full DAG JSON for live editing
    version: v.number(),
    lastEditedBy: v.optional(v.string()),
  })
    .index("by_external_id", ["externalId"])
    .index("by_user_id", ["userId"]),

  // Node lock state for collaborative editing
  nodeLocks: defineTable({
    strategyId: v.id("strategies"),
    nodeId: v.string(),
    lockedBy: v.string(), // User ID
    lockedAt: v.number(), // Timestamp
  })
    .index("by_strategy", ["strategyId"])
    .index("by_node", ["strategyId", "nodeId"]),

  // User presence on a strategy canvas
  presence: defineTable({
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
    lastSeen: v.number(),
  })
    .index("by_strategy", ["strategyId"])
    .index("by_user", ["userId"]),

  // Backtest progress streaming
  backtestProgress: defineTable({
    externalBacktestId: v.string(), // Maps to PostgreSQL backtest ID
    userId: v.string(),
    strategyId: v.string(),
    status: v.string(),
    progress: v.number(), // 0-100
    currentDate: v.optional(v.string()),
    partialEquityCurve: v.optional(v.array(v.object({
      timestamp: v.string(),
      equity: v.number(),
    }))),
    metricsSnapshot: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_backtest_id", ["externalBacktestId"])
    .index("by_user", ["userId"]),
});
