"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Version History Modal (Enhanced Phase 2)
// Git-style branch visualization with GSAP animations
// ─────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, GitBranch, GitCommit } from "lucide-react";
import { trpc } from "../../lib/trpc";
import type { StrategyDAG } from "@supercanvas/types";
import { cn } from "@supercanvas/ui";
import gsap from "gsap";

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
  const changedNodes: Array<{
    from: DagSlice["nodes"][number];
    to: DagSlice["nodes"][number];
    paramChanges: Array<{ key: string; from: unknown; to: unknown }>;
  }> = [];

  for (const [id, selNode] of selectedNodesById) {
    const curNode = currentNodesById.get(id);
    if (!curNode) {
      addedNodes.push(selNode);
      continue;
    }

    if (nodeSignature(curNode) !== nodeSignature(selNode)) {
      // Compute inline param diff
      const paramChanges: Array<{ key: string; from: unknown; to: unknown }> = [];
      const allKeys = new Set([
        ...Object.keys(curNode.params || {}),
        ...Object.keys(selNode.params || {}),
      ]);
      for (const key of allKeys) {
        const fromVal = (curNode.params as Record<string, unknown>)?.[key];
        const toVal = (selNode.params as Record<string, unknown>)?.[key];
        if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
          paramChanges.push({ key, from: fromVal, to: toVal });
        }
      }
      changedNodes.push({ from: curNode, to: selNode, paramChanges });
    }
  }

  for (const [id, curNode] of currentNodesById) {
    if (!selectedNodesById.has(id)) removedNodes.push(curNode);
  }

  const currentEdgesSet = new Map(current.edges.map((e) => [edgeSignature(e), e]));
  const selectedEdgesSet = new Map(selected.edges.map((e) => [edgeSignature(e), e]));

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
  const modalRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    added: true,
    removed: true,
    changed: true,
    edges: false,
  });

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

  // ── GSAP: Modal entrance ──
  useEffect(() => {
    if (!modalRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(modalRef.current, {
      opacity: 0,
      scale: 0.95,
    }, {
      opacity: 1,
      scale: 1,
      duration: 0.35,
      ease: "power3.out",
    });
  }, []);

  // ── GSAP: Timeline nodes stagger ──
  useEffect(() => {
    if (!timelineRef.current || versions.length === 0) return;
    const nodes = timelineRef.current.querySelectorAll(".timeline-node");
    gsap.from(nodes, {
      opacity: 0,
      x: -20,
      duration: 0.3,
      stagger: 0.05,
      ease: "power2.out",
    });
  }, [versions]);

  // ── GSAP: Diff cards entrance when selection changes ──
  useEffect(() => {
    if (!diffRef.current || !diff) return;
    const cards = diffRef.current.querySelectorAll(".diff-card");
    gsap.from(cards, {
      opacity: 0,
      y: 20,
      duration: 0.35,
      stagger: 0.04,
      ease: "power2.out",
    });
  }, [diff, effectiveSelectedVersionId]);

  const toggleSection = (section: string) => {
    const el = document.getElementById(`diff-section-${section}`);
    const isExpanding = !expandedSections[section];

    if (el) {
      if (isExpanding) {
        gsap.fromTo(el, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.3, ease: "power2.out" });
      } else {
        gsap.to(el, { height: 0, opacity: 0, duration: 0.2, ease: "power2.in" });
      }
    }

    setExpandedSections((prev) => ({ ...prev, [section]: isExpanding }));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div ref={modalRef} className="w-full max-w-4xl rounded-2xl border border-surface-dark-3 bg-surface-dark-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-dark-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-brand-400" />
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-white">Version History</div>
              <div className="text-xs text-gray-500">
                Compare snapshots and restore previous versions
              </div>
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
        <div className="grid grid-cols-5 gap-0" style={{ maxHeight: "70vh" }}>
          {/* Git-style Timeline */}
          <div ref={timelineRef} className="col-span-2 border-r border-surface-dark-3 px-4 py-4 overflow-y-auto">
            {versionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading versions…
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-gray-500">No versions yet.</p>
            ) : (
              <div className="relative ml-3">
                {/* Vertical branch line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-brand-500/60 via-surface-dark-3 to-surface-dark-3" />

                <div className="space-y-1">
                  {versions.map((v, i) => {
                    const active = v.id === effectiveSelectedVersionId;
                    const isLatest = i === 0;

                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={cn(
                          "timeline-node group relative flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-all",
                          active
                            ? "bg-brand-500/10"
                            : "hover:bg-surface-dark-2"
                        )}
                      >
                        {/* Commit dot */}
                        <div className="relative mt-0.5 flex-shrink-0">
                          <div
                            className={cn(
                              "relative z-10 rounded-full border-2 transition-all",
                              active
                                ? "h-4 w-4 border-brand-400 bg-brand-500 shadow-lg shadow-brand-500/40"
                                : "h-3 w-3 border-surface-dark-3 bg-surface-dark-2 group-hover:border-gray-500"
                            )}
                          />
                          {/* Pulse ring for selected */}
                          {active && (
                            <div className="absolute inset-0 animate-ping rounded-full border-2 border-brand-400/40" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <GitCommit className={cn(
                                "h-3 w-3",
                                active ? "text-brand-400" : "text-gray-600"
                              )} />
                              <span className={cn(
                                "text-xs font-semibold",
                                active ? "text-brand-300" : "text-white"
                              )}>
                                v{v.version}
                              </span>
                              {isLatest && (
                                <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[8px] font-bold text-brand-300">
                                  HEAD
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-600">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div
                            className="mt-0.5 text-[10px] text-gray-500 truncate"
                            title={v.message ?? undefined}
                          >
                            {v.message}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Diff Panel */}
          <div ref={diffRef} className="col-span-3 px-4 py-4 overflow-y-auto">
            {!selectedDagQuery.isLoading && !selectedDag ? (
              <p className="text-xs text-gray-500">Select a version to view diff.</p>
            ) : null}

            {selectedDagQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading snapshot…
              </div>
            ) : diff ? (
              <div className="space-y-3">
                {/* Summary cards */}
                <div className="diff-card rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-3">
                  <div className="text-xs font-semibold text-white">Diff Summary</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <span className="text-emerald-400 font-semibold">+{diff.addedNodes.length}</span> added
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <span className="text-red-400 font-semibold">-{diff.removedNodes.length}</span> removed
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <span className="text-amber-300 font-semibold">{diff.changedNodes.length}</span> changed
                    </div>
                    <div className="rounded-lg border border-surface-dark-3 px-3 py-2">
                      <span className="text-gray-300 font-semibold">
                        +{diff.addedEdges.length}/-{diff.removedEdges.length}
                      </span> edges
                    </div>
                  </div>
                </div>

                {/* Added nodes (collapsible) */}
                {diff.addedNodes.length > 0 && (
                  <CollapsibleSection
                    id="added"
                    title={`Added Nodes (${diff.addedNodes.length})`}
                    color="emerald"
                    expanded={expandedSections.added}
                    onToggle={() => toggleSection("added")}
                  >
                    {diff.addedNodes.map((n) => (
                      <div key={n.id} className="diff-card rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
                        <span className="font-semibold">+ {n.label}</span>
                        <span className="text-emerald-400/60 ml-1">({n.type})</span>
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {/* Removed nodes */}
                {diff.removedNodes.length > 0 && (
                  <CollapsibleSection
                    id="removed"
                    title={`Removed Nodes (${diff.removedNodes.length})`}
                    color="red"
                    expanded={expandedSections.removed}
                    onToggle={() => toggleSection("removed")}
                  >
                    {diff.removedNodes.map((n) => (
                      <div key={n.id} className="diff-card rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">
                        <span className="font-semibold">- {n.label}</span>
                        <span className="text-red-400/60 ml-1">({n.type})</span>
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {/* Changed nodes with inline param diff */}
                {diff.changedNodes.length > 0 && (
                  <CollapsibleSection
                    id="changed"
                    title={`Changed Nodes (${diff.changedNodes.length})`}
                    color="amber"
                    expanded={expandedSections.changed}
                    onToggle={() => toggleSection("changed")}
                  >
                    {diff.changedNodes.map(({ from, to, paramChanges }) => (
                      <div key={to.id} className="diff-card rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[11px]">
                        <div className="text-amber-200 font-semibold">
                          ~ {to.label} <span className="text-amber-400/60">({to.type})</span>
                        </div>
                        {paramChanges.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {paramChanges.map(({ key, from: fv, to: tv }) => (
                              <div key={key} className="flex items-center gap-1 text-[10px] font-mono">
                                <span className="text-gray-500">{key}:</span>
                                <span className="text-red-300 line-through">{JSON.stringify(fv)}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-emerald-300">{JSON.stringify(tv)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {/* Edge changes */}
                {(diff.addedEdges.length > 0 || diff.removedEdges.length > 0) && (
                  <CollapsibleSection
                    id="edges"
                    title={`Edge Changes (+${diff.addedEdges.length}/-${diff.removedEdges.length})`}
                    color="gray"
                    expanded={expandedSections.edges}
                    onToggle={() => toggleSection("edges")}
                  >
                    {diff.addedEdges.map((e) => (
                      <div key={e.id} className="diff-card rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 text-[10px] text-emerald-300 font-mono">
                        + {e.source}:{e.sourceHandle} → {e.target}:{e.targetHandle}
                      </div>
                    ))}
                    {diff.removedEdges.map((e) => (
                      <div key={e.id} className="diff-card rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-[10px] text-red-300 font-mono">
                        - {e.source}:{e.sourceHandle} → {e.target}:{e.targetHandle}
                      </div>
                    ))}
                  </CollapsibleSection>
                )}

                {(diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length + diff.addedEdges.length + diff.removedEdges.length) === 0 && (
                  <p className="text-xs text-gray-500 py-4 text-center">No changes between versions.</p>
                )}

                {/* Restore button */}
                <div className="diff-card rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-3">
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

// ── Collapsible Section component ──

function CollapsibleSection({
  id,
  title,
  color,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/20",
    red: "text-red-400 border-red-500/20",
    amber: "text-amber-400 border-amber-500/20",
    gray: "text-gray-400 border-surface-dark-3",
  };
  const classes = colorMap[color] || colorMap.gray;

  return (
    <div className={`rounded-xl border ${classes.split(" ")[1]} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-surface-dark-2/50 transition-colors"
      >
        <span className={`text-xs font-semibold ${classes.split(" ")[0]}`}>{title}</span>
        <span className="text-[10px] text-gray-600">{expanded ? "▾" : "▸"}</span>
      </button>
      <div id={`diff-section-${id}`} className={expanded ? "" : "hidden"}>
        <div className="space-y-1 px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}
