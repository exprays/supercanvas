import { getDb, marketDataOhlcv } from "@supercanvas/db";

async function main() {
  const db = getDb();
  console.log("Seeding OHLCV data...");

  const symbol = "AAPL";
  const timeframe = "1d";
  const rows = [];
  
  let basePrice = 150;
  const startDate = new Date("2023-01-01T00:00:00Z");

  for (let i = 0; i < 100; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const open = basePrice + (Math.random() - 0.5) * 5;
    const close = open + (Math.random() - 0.5) * 5;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(1000000 + Math.random() * 500000);

    rows.push({
      symbol,
      timeframe,
      timestamp: date,
      open,
      high,
      low,
      close,
      volume,
    });
    
    basePrice = close;
  }

  await db.insert(marketDataOhlcv).values(rows).onConflictDoNothing();
  console.log(`Seeded ${rows.length} rows for ${symbol} (${timeframe})`);
  process.exit(0);
}

main().catch(console.error);
