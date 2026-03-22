// ─────────────────────────────────────────────
// SuperCanvas — tRPC Client
// Type-safe client for use in React components
// ─────────────────────────────────────────────

import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../server/root";

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
