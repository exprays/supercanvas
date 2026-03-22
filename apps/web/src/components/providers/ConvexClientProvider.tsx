"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Convex Client Provider
// Wraps the app with Convex real-time client
// ─────────────────────────────────────────────

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }

  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
