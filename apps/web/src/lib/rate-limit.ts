// ─────────────────────────────────────────────
// SuperCanvas — Rate Limiter (Upstash)
// Sliding window rate limiting for API endpoints
// ─────────────────────────────────────────────

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

/**
 * Standard API rate limit: 1000 requests per minute
 */
export function getStandardRateLimit() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(1000, "1 m"),
    analytics: true,
    prefix: "ratelimit:standard",
  });
}

/**
 * Backtest submission rate limit: 10 requests per minute
 */
export function getBacktestRateLimit() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:backtest",
  });
}

/**
 * Auth rate limit: 20 requests per minute per IP
 */
export function getAuthRateLimit() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:auth",
  });
}
