// ─────────────────────────────────────────────
// SuperCanvas — tRPC API Route
// /api/trpc/[trpc]
// ─────────────────────────────────────────────

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { appRouter } from "../../../server/root";
import { createContext } from "../../../server/trpc/context";
import { getStandardRateLimit } from "../../../lib/rate-limit";

async function handler(req: NextRequest) {
  // ── Rate limiting ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const rateLimit = getStandardRateLimit();
  const { success } = await rateLimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
