// ─────────────────────────────────────────────
// SuperCanvas — App Router (tRPC root)
// ─────────────────────────────────────────────

import { router } from "./trpc/trpc";
import { userRouter } from "./routers/user";
import { healthRouter } from "./routers/health";
import { strategyRouter } from "./routers/strategy";
import { backtestRouter } from "./routers/backtest";

export const appRouter = router({
  user: userRouter,
  health: healthRouter,
  strategy: strategyRouter,
  backtest: backtestRouter,
  // Phase 5: marketplace: marketplaceRouter
});

export type AppRouter = typeof appRouter;
