// ─────────────────────────────────────────────
// SuperCanvas — tRPC Context
// Provides auth, DB, and Redis to all procedures
// ─────────────────────────────────────────────

import { auth } from "@clerk/nextjs/server";
import { getDb } from "@supercanvas/db";
import { getRedis } from "../../lib/redis";
import type { NextRequest } from "next/server";

export async function createContext(opts?: { req?: NextRequest }) {
  const { userId } = await auth();
  const db = getDb();
  const redis = getRedis();

  return {
    userId,
    db,
    redis,
    req: opts?.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
