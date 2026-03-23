import { getDb, marketDataOhlcv } from "@supercanvas/db";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Deseeding OHLCV data...");

  await db.delete(marketDataOhlcv).where(eq(marketDataOhlcv.symbol, "AAPL"));
  console.log("Deleted all seeded OHLCV data for AAPL");
  process.exit(0);
}

main().catch(console.error);
