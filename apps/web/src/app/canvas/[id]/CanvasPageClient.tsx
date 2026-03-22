"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Canvas Page Client
// Wires tRPC saveDAG + Convex real-time sync into the canvas
// ─────────────────────────────────────────────

import { useCallback } from "react";
import { useMutation } from "@convex-use/react";
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
  const saveDAG = trpc.strategy.saveDAG.useMutation();
  const convexUpsert = useMutation(api.strategies.upsert);
  const strategyName = useCanvasStore((s) => s.strategyName);

  const handleSave = useCallback(
    async (toDAG: typeof useCanvasStore.getState.prototype.toDAG) => {
      const dagSlice = useCanvasStore.getState().toDAG();
      const name = useCanvasStore.getState().strategyName;

      // ── Persist to PostgreSQL via tRPC ──
      await saveDAG.mutateAsync({
        id: strategyId,
        name,
        dag: dagSlice,
      });

      // ── Sync live state to Convex for real-time collaboration ──
      try {
        await convexUpsert({
          externalId: strategyId,
          userId: "self", // Convex auth will be wired in Phase 1C
          name,
          dagJson: dagSlice,
          version: 1,
        });
      } catch (err) {
        // Convex sync failure is non-fatal — Postgres is the source of truth
        Sentry.captureException(err, { tags: { context: "convex.strategy.upsert" } });
        console.warn("Convex sync failed (non-fatal):", err);
      }
    },
    [strategyId, saveDAG, convexUpsert]
  );

  return (
    <StrategyCanvas
      strategyId={strategyId}
      initialDAG={initialDAG}
      onSave={handleSave}
    />
  );
}
