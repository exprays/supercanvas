// ─────────────────────────────────────────────
// SuperCanvas — Database Schema
// Core tables: users, strategies, backtests, marketplace, ML models, market data
// ─────────────────────────────────────────────

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  bigint,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──

export const userPlanEnum = pgEnum("user_plan", ["free", "pro", "enterprise"]);

export const backtestStatusEnum = pgEnum("backtest_status", [
  "pending",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const backtestResolutionEnum = pgEnum("backtest_resolution", [
  "daily",
  "minute",
  "tick",
]);

export const listingTypeEnum = pgEnum("listing_type", [
  "signal_subscription",
  "strategy_clone",
  "parameter_locked",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "deprecated",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "past_due",
  "trialing",
]);

// ── Users ──

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    imageUrl: text("image_url"),
    plan: userPlanEnum("plan").default("free").notNull(),
    creditsRemaining: integer("credits_remaining").default(100).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_clerk_id_idx").on(table.clerkId),
    index("users_email_idx").on(table.email),
  ]
);

// ── Strategies ──

export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    dagJson: jsonb("dag_json").notNull(),
    version: integer("version").default(1).notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("strategies_user_id_idx").on(table.userId),
    index("strategies_tags_idx").on(table.tags),
  ]
);

// ── Strategy Versions (git-like history) ──

export const strategyVersions = pgTable(
  "strategy_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strategyId: uuid("strategy_id")
      .references(() => strategies.id, { onDelete: "cascade" })
      .notNull(),
    dagJson: jsonb("dag_json").notNull(),
    version: integer("version").notNull(),
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("strategy_versions_strategy_id_idx").on(table.strategyId),
  ]
);

// ── Backtests ──

export const backtests = pgTable(
  "backtests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strategyId: uuid("strategy_id")
      .references(() => strategies.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    configHash: varchar("config_hash", { length: 64 }).notNull(),
    configJson: jsonb("config_json").notNull(),
    status: backtestStatusEnum("status").default("pending").notNull(),
    resolution: backtestResolutionEnum("resolution").notNull(),
    resultUrl: text("result_url"),
    metricsJson: jsonb("metrics_json"),
    dagSnapshot: jsonb("dag_snapshot"),  // Strategy DAG at time of submission
    creditsUsed: integer("credits_used").default(0).notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("backtests_strategy_id_idx").on(table.strategyId),
    index("backtests_user_id_idx").on(table.userId),
    index("backtests_config_hash_idx").on(table.configHash),
    index("backtests_status_idx").on(table.status),
  ]
);

// ── Marketplace Listings ──

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strategyId: uuid("strategy_id")
      .references(() => strategies.id, { onDelete: "cascade" })
      .notNull(),
    creatorId: uuid("creator_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    listingType: listingTypeEnum("listing_type").notNull(),
    status: listingStatusEnum("status").default("draft").notNull(),
    price: integer("price").default(0).notNull(), // in cents
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    tags: text("tags").array(),
    assetClasses: text("asset_classes").array(),
    metricsJson: jsonb("metrics_json"),
    hasForwardTestBadge: boolean("has_forward_test_badge").default(false).notNull(),
    forwardTestEnd: timestamp("forward_test_end"),
    verifiedAt: timestamp("verified_at"),
    stripeProductId: varchar("stripe_product_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("marketplace_listings_creator_id_idx").on(table.creatorId),
    index("marketplace_listings_status_idx").on(table.status),
  ]
);

// ── Subscriptions ──

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    listingId: uuid("listing_id")
      .references(() => marketplaceListings.id, { onDelete: "cascade" })
      .notNull(),
    stripeSubId: varchar("stripe_sub_id", { length: 255 }),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_listing_id_idx").on(table.listingId),
  ]
);

// ── ML Models ──

export const mlModels = pgTable(
  "ml_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strategyId: uuid("strategy_id")
      .references(() => strategies.id, { onDelete: "cascade" })
      .notNull(),
    nodeId: varchar("node_id", { length: 255 }).notNull(),
    modelType: varchar("model_type", { length: 100 }).notNull(),
    onnxUrl: text("onnx_url"),
    metricsJson: jsonb("metrics_json"),
    mlflowRunId: varchar("mlflow_run_id", { length: 255 }),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ml_models_strategy_id_idx").on(table.strategyId),
  ]
);

// ── Market Data OHLCV ──
// Note: In production with TimescaleDB, this would be a hypertable.
// For Neon free tier, we use a regular table with indexes.

export const marketDataOhlcv = pgTable(
  "market_data_ohlcv",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    timeframe: varchar("timeframe", { length: 10 }).notNull(), // 1m, 5m, 1h, 1d
    timestamp: timestamp("ts").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: bigint("volume", { mode: "number" }).notNull(),
  },
  (table) => [
    index("market_data_symbol_ts_idx").on(table.symbol, table.timestamp),
    index("market_data_timeframe_idx").on(table.timeframe),
    uniqueIndex("market_data_unique_idx").on(
      table.symbol,
      table.timeframe,
      table.timestamp
    ),
  ]
);
