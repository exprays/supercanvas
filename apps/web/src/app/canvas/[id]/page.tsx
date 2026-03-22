// ─────────────────────────────────────────────
// SuperCanvas — Canvas Page
// /canvas/[id] — loads strategy DAG and renders the canvas
// Server component that fetches strategy, then hands off to client canvas
// ─────────────────────────────────────────────

import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getDb, strategies, users } from "@supercanvas/db";
import { eq, and } from "drizzle-orm";
import type { StrategyDAG } from "@supercanvas/types";
import { CanvasPageClient } from "./CanvasPageClient";

interface CanvasPageProps {
  params: { id: string };
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const db = getDb();

  // ── Resolve user DB id ──
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, user.id))
    .limit(1);

  if (!dbUser) redirect("/sign-in");

  // ── Load strategy ──
  const [strategy] = await db
    .select()
    .from(strategies)
    .where(
      and(
        eq(strategies.id, params.id),
        eq(strategies.userId, dbUser.id)
      )
    )
    .limit(1);

  if (!strategy) notFound();

  // Construct a full StrategyDAG from DB row
  const dagJson = strategy.dagJson as { nodes: unknown[]; edges: unknown[] };
  const initialDAG: StrategyDAG = {
    id: strategy.id,
    name: strategy.name,
    version: strategy.version,
    nodes: (dagJson.nodes ?? []) as StrategyDAG["nodes"],
    edges: (dagJson.edges ?? []) as StrategyDAG["edges"],
    metadata: {
      createdAt: strategy.createdAt.toISOString(),
      updatedAt: strategy.updatedAt.toISOString(),
      author: user.id,
      tags: strategy.tags ?? [],
      description: strategy.description ?? undefined,
    },
  };

  return (
    <div className="h-screen overflow-hidden bg-surface-dark-0">
      <CanvasPageClient
        strategyId={strategy.id}
        initialDAG={initialDAG}
      />
    </div>
  );
}

export function generateMetadata({ params }: CanvasPageProps) {
  return {
    title: "Strategy Canvas — SuperCanvas",
  };
}
