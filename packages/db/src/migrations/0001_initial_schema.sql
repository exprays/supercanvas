-- ─────────────────────────────────────────────
-- SuperCanvas — Migration 0001
-- Initial schema: users, strategies, backtests, marketplace, ML, market data
-- ─────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "user_plan" AS ENUM ('free', 'pro', 'enterprise');

CREATE TYPE "backtest_status" AS ENUM (
  'pending', 'queued', 'running', 'completed', 'failed', 'cancelled'
);

CREATE TYPE "backtest_resolution" AS ENUM ('daily', 'minute', 'tick');

CREATE TYPE "listing_type" AS ENUM (
  'signal_subscription', 'strategy_clone', 'parameter_locked'
);

CREATE TYPE "listing_status" AS ENUM (
  'draft', 'pending_review', 'active', 'suspended', 'deprecated'
);

CREATE TYPE "subscription_status" AS ENUM (
  'active', 'cancelled', 'past_due', 'trialing'
);

-- ── Users ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id"          VARCHAR(255) NOT NULL UNIQUE,
  "email"             VARCHAR(255) NOT NULL,
  "first_name"        VARCHAR(255),
  "last_name"         VARCHAR(255),
  "image_url"         TEXT,
  "plan"              "user_plan" NOT NULL DEFAULT 'free',
  "credits_remaining" INTEGER NOT NULL DEFAULT 100,
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" ("clerk_id");
CREATE INDEX "users_email_idx" ON "users" ("email");

-- ── Strategies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "strategies" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "dag_json"    JSONB NOT NULL,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "is_public"   BOOLEAN NOT NULL DEFAULT FALSE,
  "tags"        TEXT[],
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "strategies_user_id_idx" ON "strategies" ("user_id");
CREATE INDEX "strategies_tags_idx" ON "strategies" ("tags");

-- ── Strategy Versions (git-like history) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "strategy_versions" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "strategy_id" UUID NOT NULL REFERENCES "strategies"("id") ON DELETE CASCADE,
  "dag_json"    JSONB NOT NULL,
  "version"     INTEGER NOT NULL,
  "message"     TEXT,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "strategy_versions_strategy_id_idx" ON "strategy_versions" ("strategy_id");

-- ── Backtests ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "backtests" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "strategy_id"   UUID NOT NULL REFERENCES "strategies"("id") ON DELETE CASCADE,
  "user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "config_hash"   VARCHAR(64) NOT NULL,
  "config_json"   JSONB NOT NULL,
  "status"        "backtest_status" NOT NULL DEFAULT 'pending',
  "resolution"    "backtest_resolution" NOT NULL,
  "result_url"    TEXT,
  "metrics_json"  JSONB,
  "credits_used"  INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at"    TIMESTAMP,
  "completed_at"  TIMESTAMP,
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "backtests_strategy_id_idx" ON "backtests" ("strategy_id");
CREATE INDEX "backtests_user_id_idx" ON "backtests" ("user_id");
CREATE INDEX "backtests_config_hash_idx" ON "backtests" ("config_hash");
CREATE INDEX "backtests_status_idx" ON "backtests" ("status");

-- ── Marketplace Listings ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "marketplace_listings" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "strategy_id"          UUID NOT NULL REFERENCES "strategies"("id") ON DELETE CASCADE,
  "creator_id"           UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"                 VARCHAR(255) NOT NULL,
  "description"          TEXT,
  "listing_type"         "listing_type" NOT NULL,
  "status"               "listing_status" NOT NULL DEFAULT 'draft',
  "price"                INTEGER NOT NULL DEFAULT 0,
  "currency"             VARCHAR(3) NOT NULL DEFAULT 'USD',
  "tags"                 TEXT[],
  "asset_classes"        TEXT[],
  "metrics_json"         JSONB,
  "has_forward_test_badge" BOOLEAN NOT NULL DEFAULT FALSE,
  "forward_test_end"     TIMESTAMP,
  "verified_at"          TIMESTAMP,
  "stripe_product_id"    VARCHAR(255),
  "stripe_price_id"      VARCHAR(255),
  "created_at"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "marketplace_listings_creator_id_idx" ON "marketplace_listings" ("creator_id");
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings" ("status");

-- ── Subscriptions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id"   UUID NOT NULL REFERENCES "marketplace_listings"("id") ON DELETE CASCADE,
  "stripe_sub_id" VARCHAR(255),
  "status"       "subscription_status" NOT NULL DEFAULT 'active',
  "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX "subscriptions_listing_id_idx" ON "subscriptions" ("listing_id");

-- ── ML Models ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ml_models" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "strategy_id"   UUID NOT NULL REFERENCES "strategies"("id") ON DELETE CASCADE,
  "node_id"       VARCHAR(255) NOT NULL,
  "model_type"    VARCHAR(100) NOT NULL,
  "onnx_url"      TEXT,
  "metrics_json"  JSONB,
  "mlflow_run_id" VARCHAR(255),
  "version"       INTEGER NOT NULL DEFAULT 1,
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "ml_models_strategy_id_idx" ON "ml_models" ("strategy_id");

-- ── Market Data OHLCV ─────────────────────────────────────────────────────
-- Production: CREATE TABLE ... and then SELECT create_hypertable('market_data_ohlcv','ts')
-- Neon free tier: regular table with composite index

CREATE TABLE IF NOT EXISTS "market_data_ohlcv" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "symbol"    VARCHAR(20) NOT NULL,
  "timeframe" VARCHAR(10) NOT NULL,
  "ts"        TIMESTAMP NOT NULL,
  "open"      REAL NOT NULL,
  "high"      REAL NOT NULL,
  "low"       REAL NOT NULL,
  "close"     REAL NOT NULL,
  "volume"    BIGINT NOT NULL
);

CREATE INDEX "market_data_symbol_ts_idx" ON "market_data_ohlcv" ("symbol", "ts");
CREATE INDEX "market_data_timeframe_idx" ON "market_data_ohlcv" ("timeframe");
CREATE UNIQUE INDEX "market_data_unique_idx" ON "market_data_ohlcv" ("symbol", "timeframe", "ts");

-- ── updated_at auto-trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
