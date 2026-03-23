"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { trpc } from "../../lib/trpc";
import type { StrategyDAG } from "@supercanvas/types";
import { cn } from "@supercanvas/ui";

type DagSlice = Omit<StrategyDAG, "id" | "name" | "version" | "metadata">;

function stableJson(value: unknown) {
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function nodeSignature(node: DagSlice["nodes"][number]) {
  return stableJson({
    type: node.type,
    label: node.label,
    category: node.category,
    params: node.params,
    // position changes are not usually the signal a user cares about in diffs
    // but we keep them in the output below as "changed" signals.
    position: node.position,
  });
}

function edgeSignature(edge: DagSlice["edges"][number]) {
  return stableJson({
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  });
}

function diffDag(current: DagSlice, selected: DagSlice) {
  const currentNodesById = new Map(current.nodes.map((n) => [n.id, n]));
  const selectedNodesById = new Map(selected.nodes.map((n) => [n.id, n]));

  const addedNodes: DagSlice["nodes"] = [];
  const removedNodes: DagSlice["nodes"] = [];
  const changedNodes: Array<{ from: DagSlice["nodes"][number]; to: DagSlice["nodes"][number] }> =
    [];

  for (const [id, selNode] of selectedNodesById) {
    const curNode = currentNodesById.get(id);
    if (!curNode) {
      addedNodes.push(selNode);
      continue;
    }

    if (nodeSignature(curNode) !== nodeSignature(selNode)) {
      changedNodes.push({ from: curNode, to: selNode });
    }
  }

  for (const [id, curNode] of currentNodesById) {
    if (!selectedNodesById.has(id)) removedNodes.push(curNode);
  }

  const currentEdgesSet = new Map(
    current.edges.map((e) => [edgeSignature(e), e])
  );
  const selectedEdgesSet = new Map(
    selected.edges.map((e) => [edgeSignature(e), e])
  );

  const addedEdges: DagSlice["edges"] = [];
  const removedEdges: DagSlice["edges"] = [];

  for (const [sig, e] of selectedEdgesSet) {
    if (!currentEdgesSet.has(sig)) addedEdges.push(e);
  }
  for (const [sig, e] of currentEdgesSet) {
    if (!selectedEdgesSet.has(sig)) removedEdges.push(e);
  }

  return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges };
}

export function VersionHistoryModal({
  strategyId,
  currentDag,
  onClose,
  onRestore,
}: {
  strategyId: string;
  currentDag: DagSlice;
  onClose: () => void;
  onRestore: (args: { dagJson: DagSlice; restoredVersion: number }) => Promise<void>;
}) {
  const versionsQuery = trpc.strategy.versions.useQuery({ strategyId });
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const selectedDagQuery = trpc.strategy.getVersionDAG.useQuery(
    { versionId: selectedVersionId ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: !!selectedVersionId }
  );

  const versions = versionsQuery.data ?? [];

  const latestVersionId = versions[0]?.id ?? null;
  const effectiveSelectedVersionId: string | undefined =
    selectedVersionId ?? latestVersionId ?? undefined;

  // Keep selection stable once user chooses a version; default to latest.
  useEffect(() => {
    if (!selectedVersionId && latestVersionId) {
      setSelectedVersionId(latestVersionId);
    }
  }, [latestVersionId, selectedVersionId]);

  const selectedDag: DagSlice | null = selectedDagQuery.data
    ? (selectedDagQuery.data.dagJson as DagSlice)
    : null;

  const diff = useMemo(() => {
    if (!selectedDag) return null;
    return diffDag(currentDag, selectedDag);
  }, [currentDag, selectedDag]);

  const restoreMutation = trpc.strategy.restoreVersion.useMutation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-surface-dark-3 bg-surface-dark-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-dark-3 px-5 py-4">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-white">Version History</div>
            <div className="text-xs text-gray-500">
              Compare snapshots and restore previous versions
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-5 gap-0">
          {/* Version list */}
          <div className="col-span-2 border-r border-surface-dark-3 px-4 py-4 overflow-y-auto max-h-[70vh]">
            {versionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading versions…
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-gray-500">No versions yet.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => {
                  const active = v.id === effectiveSelectedVersionId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersionId(v.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-brand-500/40 bg-brand-500/10"
                          : "border-surface-dark-3 bg-transparent hover:bg-surface-dark-2"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">v{v.version}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div
                        className="mt-1 text-[11px] text-gray-400 truncate"
                        title={v.message ?? undefined}
                      >
                        {v.message}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Diff */}
          <div className="col-span-3 px-4 py-4 overflow-y-auto max-h-[70vh]">
            {!selectedDagQuery.isLoading && !selectedDag ? (
              <p className="text-xs text-gray-500">Select a version to view diff.</p>
            ) : null}

            {selectedDagQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading snapshot…
              </div>
            ) : diff ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-3">
                  <div className="text-xs font-semibold text-white">Diff summary</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <span className="text-emerald-400 font-semibold">
                        +{diff.addedNodes.length}
                      </span>{" "}
                      added nodes
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <span className="text-red-400 font-semibold">
                        -{diff.removedNodes.length}
                      </span>{" "}
                      removed nodes
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <span className="text-amber-300 font-semibold">
                        {diff.changedNodes.length}
                      </span>{" "}
                      changed nodes
                    </div>
                    <div className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2">
                      <span className="text-gray-300 font-semibold">
                        +{diff.addedEdges.length}/-{diff.removedEdges.length}
                      </span>{" "}
                      edges
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white">Node changes</div>
                  <div className="mt-2 space-y-2">
                    {diff.addedNodes.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200"
                      >
                        + {n.id} ({n.type})
                      </div>
                    ))}
                    {diff.removedNodes.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-[11px] text-red-200"
                      >
                        - {n.id} ({n.type})
                      </div>
                    ))}
                    {diff.changedNodes.slice(0, 8).map(({ from, to }) => (
                      <div
                        key={to.id}
                        className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200"
                      >
                        ~ {to.id} ({from.type} → {to.type})
                      </div>
                    ))}
                    {(diff.addedNodes.length +
                      diff.removedNodes.length +
                      diff.changedNodes.length) ===
                      0 && (
                      <p className="text-xs text-gray-500">No node-level changes.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white">Restore</div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    This will set the current strategy DAG to the selected snapshot.
                  </p>
                  <div className="mt-3 flex items-center gap-3 justify-end">
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-xs text-gray-300 hover:bg-surface-dark-3 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!effectiveSelectedVersionId) return;
                        const res = await restoreMutation.mutateAsync({
                          versionId: effectiveSelectedVersionId,
                        });
                        await onRestore({
                          dagJson: res.dagJson as DagSlice,
                          restoredVersion: res.restoredVersion,
                        });
                      }}
                      disabled={restoreMutation.isPending || !effectiveSelectedVersionId}
                      className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {restoreMutation.isPending ? "Restoring…" : "Restore Version"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

