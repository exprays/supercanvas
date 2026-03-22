// ─────────────────────────────────────────────
// SuperCanvas — Health Router
// Checks all downstream dependencies
// ─────────────────────────────────────────────

import { publicProcedure, router } from "../trpc/trpc";

export const healthRouter = router({
  /**
   * Full dependency health check.
   * Used by monitoring and the admin dashboard.
   */
  check: publicProcedure.query(async ({ ctx }) => {
    const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

    // ── Database ──
    const dbStart = Date.now();
    try {
      await ctx.db.execute("SELECT 1 as ping" as any);
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (e) {
      checks.database = { ok: false, error: String(e) };
    }

    // ── Redis ──
    const redisStart = Date.now();
    try {
      await ctx.redis.ping();
      checks.redis = { ok: true, latencyMs: Date.now() - redisStart };
    } catch (e) {
      checks.redis = { ok: false, error: String(e) };
    }

    const allOk = Object.values(checks).every((c) => c.ok);

    return {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    };
  }),
});
