// ─────────────────────────────────────────────
// SuperCanvas — App Router (tRPC root)
// Merges all sub-routers into a single type-safe API
// ─────────────────────────────────────────────

import { router } from "./trpc/trpc";
import { userRouter } from "./routers/user";
import { healthRouter } from "./routers/health";

export const appRouter = router({
  user: userRouter,
  health: healthRouter,
  // Phase 1: strategy: strategyRouter
  // Phase 2: backtest: backtestRouter
  // Phase 5: marketplace: marketplaceRouter
});

export type AppRouter = typeof appRouter;
