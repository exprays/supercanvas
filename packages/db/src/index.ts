// ─────────────────────────────────────────────
// SuperCanvas — Database Client
// Uses Neon serverless driver with Drizzle ORM
// ─────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDb(databaseUrl?: string) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Default instance (lazy — only created when first accessed)
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// Re-export schema and types
export * from "./schema";
export type Database = ReturnType<typeof createDb>;
