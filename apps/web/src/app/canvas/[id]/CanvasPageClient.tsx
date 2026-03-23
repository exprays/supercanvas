"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Canvas Page Client
// Wires tRPC saveDAG + Convex real-time sync into the canvas
// ─────────────────────────────────────────────

import { useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@supercanvas/convex";
import { trpc } from "../../../lib/trpc";
import { StrategyCanvas } from "../../../components/canvas/StrategyCanvas";
import type { StrategyDAG } from "@supercanvas/types";
import { useCanvasStore } from "../../../lib/canvas-store";
import * as Sentry from "@sentry/nextjs";

interface CanvasPageClientProps {
  strategyId: string;
  initialDAG: StrategyDAG;
}

export function CanvasPageClient({
  strategyId,
  initialDAG,
}: CanvasPageClientProps) {
  const { user } = useUser();
  const saveDAG = trpc.strategy.saveDAG.useMutation();
  const convexUpsert = useMutation(api.strategies.upsert);
  // Strategy name in Convex should come from the initial server DAG (not the client store).
  const dagSlice = { nodes: initialDAG.nodes, edges: initialDAG.edges };

  // Ensure a Convex "strategy" document exists for this editor session.
  useEffect(() => {
    if (!user?.id) return;
    void convexUpsert({
      externalId: strategyId,
      userId: user.id,
      name: initialDAG.name,
      dagJson: dagSlice,
      version: initialDAG.version,
    }).catch(() => {
      // Presence/node-lock should be non-fatal if Convex sync fails.
    });
  }, [convexUpsert, dagSlice.edges, dagSlice.nodes, initialDAG.name, initialDAG.version, strategyId, user?.id]);

  const handleSave = useCallback(
    async (toDAG: typeof useCanvasStore.getState.prototype.toDAG) => {
      const dagSlice = useCanvasStore.getState().toDAG();
      const name = useCanvasStore.getState().strategyName;

      // ── Persist to PostgreSQL via tRPC ──
      const saved = await saveDAG.mutateAsync({
        id: strategyId,
        name,
        dag: dagSlice,
      });

      // ── Sync live state to Convex for real-time collaboration ──
      try {
        await convexUpsert({
          externalId: strategyId,
          userId: user?.id ?? "unknown",
          name,
          dagJson: dagSlice,
          version: saved.version,
        });
      } catch (err) {
        // Convex sync failure is non-fatal — Postgres is the source of truth
        Sentry.captureException(err, { tags: { context: "convex.strategy.upsert" } });
        console.warn("Convex sync failed (non-fatal):", err);
      }
    },
    [strategyId, saveDAG, convexUpsert, user?.id]
  );

  return (
    <div className="h-full min-h-0">
      <StrategyCanvas
        strategyId={strategyId}
        initialDAG={initialDAG}
        onSave={handleSave}
      />
    </div>
  );
}
