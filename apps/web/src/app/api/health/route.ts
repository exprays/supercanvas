// ─────────────────────────────────────────────
// SuperCanvas — Health Check API
// Checks DB + Redis connectivity
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getDb } from "@supercanvas/db";
import { getRedis } from "../../../lib/redis";

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // ── Database ──
  const dbStart = Date.now();
  try {
    const db = getDb();
    await db.execute("SELECT 1 as ping" as any);
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = { ok: false, error: String(e) };
  }

  // ── Redis ──
  const redisStart = Date.now();
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = { ok: true, latencyMs: Date.now() - redisStart };
  } catch (e) {
    checks.redis = { ok: false, error: String(e) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      service: "supercanvas-web",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
