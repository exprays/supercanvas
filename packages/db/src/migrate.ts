// ─────────────────────────────────────────────
// SuperCanvas — DB Migration Runner
// Run with: pnpm db:migrate
// ─────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import path from "path";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("🔌 Connecting to database...");
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("🚀 Running migrations...");
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "migrations"),
  });

  console.log("✅ Migrations complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
