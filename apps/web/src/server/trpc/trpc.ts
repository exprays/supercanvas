// ─────────────────────────────────────────────
// SuperCanvas — tRPC Server Initialisation
// Defines base procedures and auth middleware
// ─────────────────────────────────────────────

import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ── Router & Procedure factories ───────────────────────────────────────────
export const router = t.router;
export const publicProcedure = t.procedure;

// ── Auth middleware ────────────────────────────────────────────────────────
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      // Narrow type — userId is string after auth check
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// ── Rate-limit middleware ──────────────────────────────────────────────────
// Applied per-procedure where needed (backtest submission, etc.)
export const createCallerFactory = t.createCallerFactory;
