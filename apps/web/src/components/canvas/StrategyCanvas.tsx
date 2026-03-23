"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Strategy Canvas
// Main React Flow canvas with drag-drop, keyboard shortcuts, real-time sync
// ─────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { cn } from "@supercanvas/ui";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@supercanvas/convex";
import { useCanvasStore } from "../../lib/canvas-store";
import { validateDAG } from "../../lib/dag-validator";
import { StrategyNodeComponent } from "./StrategyNode";
import { NodePalette } from "./NodePalette";
import { NodeInspector } from "./NodeInspector";
import { CanvasToolbar } from "./CanvasToolbar";
import { ValidationPanel } from "./ValidationPanel";
import { VersionHistoryModal } from "./VersionHistoryModal";
import type { StrategyDAG } from "@supercanvas/types";

// Register custom node types once — outside component to avoid re-render
const nodeTypes = { strategyNode: StrategyNodeComponent };

interface StrategyCanvasProps {
  strategyId: string;
  initialDAG?: StrategyDAG;
  onSave: (dag: ReturnType<typeof useCanvasStore.getState>["toDAG"]) => Promise<void>;
}

function CanvasInner({ strategyId, initialDAG, onSave }: StrategyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [showValidation, setShowValidation] = useState(false);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateDAG> | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { user } = useUser();
  const currentUserId = user?.id ?? null;
  const currentUserName = user?.fullName ?? user?.firstName ?? "Anonymous";
  const currentUserColor = useMemo(() => {
    const palette = [
      "#22d3ee",
      "#60a5fa",
      "#a78bfa",
      "#34d399",
      "#f59e0b",
      "#f87171",
      "#8b5cf6",
      "#5c7cfa",
    ];
    if (!currentUserId) return palette[0];
    let h = 0;
    for (let i = 0; i < currentUserId.length; i++) h = (h * 31 + currentUserId.charCodeAt(i)) >>> 0;
    return palette[h % palette.length]!;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    useCanvasStore.setState({ currentUserId });
  }, [currentUserId]);

  // ── Convex collaboration (presence + node locks) ──────────────────────────
  const convexStrategy = useQuery(api.strategies.getByExternalId, {
    externalId: strategyId,
  });
  const convexStrategyId = convexStrategy?._id;

  const presenceList = useQuery(
    api.presence.getPresence,
    convexStrategyId ? { strategyId: convexStrategyId } : "skip"
  );
  const nodeLocks = useQuery(
    api.presence.getNodeLocks,
    convexStrategyId ? { strategyId: convexStrategyId } : "skip"
  );

  const updatePresence = useMutation(api.presence.updatePresence);
  const removePresence = useMutation(api.presence.removePresence);
  const acquireNodeLock = useMutation(api.presence.acquireNodeLock);
  const releaseNodeLock = useMutation(api.presence.releaseNodeLock);

  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastPresenceSentAtRef = useRef<number>(0);
  const activeLockNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Keep local lock state in sync with Convex.
    if (!nodeLocks) return;
    const lockMap = new Map<string, string>(
      nodeLocks.map((l: { nodeId: string; lockedBy: string }) => [
        l.nodeId,
        l.lockedBy,
      ])
    );
    useCanvasStore.setState((state: any) => ({
      nodes: (state.nodes as any[]).map((n: any) => {
        const lockedBy = lockMap.get(n.id);
        const lockedByOther = lockedBy && lockedBy !== currentUserId;
        return {
          ...n,
          draggable: !lockedByOther,
          data: { ...n.data, lockedBy: lockedBy ?? undefined },
        };
      }),
    }));
  }, [nodeLocks, currentUserId]);

  const pushPresence = useCallback(
    (cursorPosition?: { x: number; y: number } | null) => {
      if (!convexStrategyId || !currentUserId) return;
      void updatePresence({
        strategyId: convexStrategyId,
        userId: currentUserId,
        userName: currentUserName,
        userColor: currentUserColor,
        cursorPosition: cursorPosition ?? undefined,
      });
    },
    [
      convexStrategyId,
      currentUserId,
      currentUserName,
      currentUserColor,
      updatePresence,
    ]
  );

  useEffect(() => {
    if (!convexStrategyId || !currentUserId) return;

    // Periodic heartbeat keeps presence alive even when the mouse is still.
    const interval = setInterval(() => {
      pushPresence(lastCursorPositionRef.current);
    }, 10_000);

    return () => clearInterval(interval);
  }, [convexStrategyId, currentUserId, pushPresence]);

  useEffect(() => {
    if (!convexStrategyId || !currentUserId) return;

    return () => {
      void removePresence({ strategyId: convexStrategyId, userId: currentUserId });
    };
  }, [convexStrategyId, currentUserId, removePresence]);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    setNodes,
    loadDAG,
    toDAG,
    markSaved,
    setStrategyMeta,
  } = useCanvasStore();

  // Load initial DAG
  useEffect(() => {
    if (initialDAG) {
      loadDAG(initialDAG);
      setStrategyMeta(strategyId, initialDAG.name);
    }
  }, [initialDAG, strategyId, loadDAG, setStrategyMeta]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT";

      if (isInputFocused) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      // zundo history
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const store = useCanvasStore.getState() as any;
        store.undo?.();
        useCanvasStore.setState({ isDirty: true });
        setSaveState("unsaved");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        const store = useCanvasStore.getState() as any;
        store.redo?.();
        useCanvasStore.setState({ isDirty: true });
        setSaveState("unsaved");
        return;
      }
      if (e.key === "Escape") selectNode(null);
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedNodeId = useCanvasStore.getState().selectedNodeId;
        if (selectedNodeId) {
          useCanvasStore.getState().deleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Auto-save every 30s if dirty ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (useCanvasStore.getState().isDirty) {
        handleSave();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await onSave(toDAG);
      markSaved();
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      console.error("Save failed:", err);
    }
  }, [onSave, toDAG, markSaved]);

  const handleValidate = useCallback(() => {
    const dagSlice = toDAG();
    const fullDag: StrategyDAG = {
      id: strategyId,
      name: useCanvasStore.getState().strategyName,
      version: 1,
      nodes: dagSlice.nodes,
      edges: dagSlice.edges,
      metadata: { createdAt: "", updatedAt: "", author: "", tags: [] },
    };
    const result = validateDAG(fullDag);
    setValidationResult(result);
    setShowValidation(true);
  }, [toDAG, strategyId]);

  const handleRestoreFromVersion = useCallback(
    async ({
      dagJson,
      restoredVersion,
    }: {
      dagJson: Omit<StrategyDAG, "id" | "name" | "version" | "metadata">;
      restoredVersion: number;
    }) => {
      const fullDag: StrategyDAG = {
        id: strategyId,
        name: useCanvasStore.getState().strategyName,
        version: restoredVersion,
        nodes: dagJson.nodes,
        edges: dagJson.edges,
        metadata: {
          createdAt: "",
          updatedAt: "",
          author: "",
          tags: [],
        },
      };

      loadDAG(fullDag);
      markSaved();
      setSaveState("saved");
      setShowHistory(false);
    },
    [loadDAG, markSaved, strategyId]
  );

  const handleAutoLayout = useCallback(() => {
    const dagSlice: any = toDAG();
    const nodeIds = dagSlice.nodes.map((n: any) => n.id as string);

    const indegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) {
      indegree.set(id, 0);
      adj.set(id, []);
    }
    for (const e of dagSlice.edges) {
      adj.get(e.source)?.push(e.target);
      indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
    }

    // Kahn's algorithm for a stable topological layering.
    const queue: string[] = [];
    for (const id of nodeIds) {
      if ((indegree.get(id) ?? 0) === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adj.get(id) ?? []) {
        indegree.set(next, (indegree.get(next) ?? 0) - 1);
        if ((indegree.get(next) ?? 0) === 0) queue.push(next);
      }
    }

    // If there's a cycle, keep current positions.
    if (order.length !== nodeIds.length) return;

    const level = new Map<string, number>();
    for (const id of order) {
      const cur = level.get(id) ?? 0;
      for (const next of adj.get(id) ?? []) {
        level.set(next, Math.max(level.get(next) ?? 0, cur + 1));
      }
    }

    const layers = new Map<number, string[]>();
    for (const id of nodeIds) {
      const l = level.get(id) ?? 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(id);
    }

    // Deterministic ordering within each layer.
    const nodeLabelById = new Map<string, string>(
      dagSlice.nodes.map((n: any) => [String(n.id), String(n.label)])
    );
    const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);
    for (const key of sortedLayerKeys) {
      layers.get(key)!.sort((a: string, b: string) =>
        (nodeLabelById.get(a) ?? "").localeCompare(nodeLabelById.get(b) ?? "")
      );
    }

    const X_SPACING = 340;
    const Y_SPACING = 140;

    const nextNodes = nodes.map((n: any) => {
      const l = level.get(n.id) ?? 0;
      const layerIds = layers.get(l) ?? [];
      const idx = layerIds.indexOf(n.id);
      return {
        ...n,
        position: {
          x: l * X_SPACING,
          y: idx * Y_SPACING,
        },
      };
    });

    setNodes(nextNodes);
  }, [nodes, setNodes, toDAG]);

  // ── Drag-from-palette drop handler ──
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!rfInstance || !reactFlowWrapper.current) return;

      const nodeType = event.dataTransfer.getData("application/supercanvas-node");
      if (!nodeType) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNode(nodeType, position);
    },
    [rfInstance, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/supercanvas-node", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!reactFlowWrapper.current) return;
      if (!convexStrategyId || !currentUserId) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      lastCursorPositionRef.current = { x, y };

      const now = Date.now();
      // Throttle writes to Convex.
      if (now - lastPresenceSentAtRef.current > 450) {
        lastPresenceSentAtRef.current = now;
        pushPresence({ x, y });
      }
    },
    [convexStrategyId, currentUserId, pushPresence]
  );

  const releaseActiveLock = useCallback(() => {
    const nodeId = activeLockNodeIdRef.current;
    if (!nodeId || !convexStrategyId || !currentUserId) return;
    activeLockNodeIdRef.current = null;
    void releaseNodeLock({ strategyId: convexStrategyId, nodeId, userId: currentUserId });
  }, [convexStrategyId, currentUserId, releaseNodeLock]);

  const handleNodeMouseDown = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (!convexStrategyId || !currentUserId) return;
      if (!node?.id) return;

      activeLockNodeIdRef.current = String(node.id);
      void acquireNodeLock({
        strategyId: convexStrategyId,
        nodeId: String(node.id),
        userId: currentUserId,
      });

      // Release after interaction ends.
      window.addEventListener(
        "mouseup",
        () => {
          releaseActiveLock();
        },
        { once: true }
      );
    },
    [acquireNodeLock, convexStrategyId, currentUserId, releaseActiveLock]
  );

  const validationErrorCount = validationResult?.errors.length ?? 0;

  return (
    <div className="flex h-full flex-col bg-surface-dark-0">
      {/* Toolbar */}
      <CanvasToolbar
        onSave={handleSave}
        onValidate={handleValidate}
        onOpenHistory={() => setShowHistory(true)}
        onAutoLayout={handleAutoLayout}
        saveState={saveState}
        validationErrorCount={validationErrorCount}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <NodePalette onDragStart={onDragStart} />

        {/* Center: React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="relative flex-1"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onMouseMove={handleMouseMove}
        >
          <ReactFlow
            {...({ onNodeMouseDown: handleNodeMouseDown } as any)}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={setRfInstance}
            onPaneClick={() => selectNode(null)}
            deleteKeyCode={null} // We handle delete manually
            fitView
            fitViewOptions={{ padding: 0.15 }}
            snapToGrid
            snapGrid={[20, 20]}
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              style: { strokeWidth: 1.5, stroke: "#373a40" },
              animated: false,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#373a40"
            />
            <MiniMap
              nodeColor={(node) => {
                const type = node.data?.type as string;
                const colors: Record<string, string> = {
                  ohlcv_feed: "#22d3ee",
                  sma: "#60a5fa",
                  ema: "#60a5fa",
                  rsi: "#a78bfa",
                  macd: "#818cf8",
                  market_order: "#5c7cfa",
                  stop_loss: "#f87171",
                  take_profit: "#34d399",
                  pnl_chart: "#8b5cf6",
                };
                return colors[type] ?? "#5c7cfa";
              }}
              maskColor="rgba(26,27,30,0.8)"
              style={{ background: "#25262b", border: "1px solid #373a40" }}
            />
            <Controls
              style={{ background: "#25262b", border: "1px solid #373a40" }}
            />
          </ReactFlow>

          {/* Presence cursors */}
          {presenceList?.map((p: any) => {
            if (!p.cursorPosition) return null;
            if (currentUserId && p.userId === currentUserId) return null;
            return (
              <div
                key={p.userId}
                className="pointer-events-none absolute z-50"
                style={{
                  left: p.cursorPosition.x,
                  top: p.cursorPosition.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full border border-black/40"
                  style={{ background: p.userColor }}
                />
                <div
                  className="mt-1 rounded px-2 py-0.5 text-[10px] text-white/90 border border-black/30"
                  style={{ background: "rgba(0,0,0,0.35)" }}
                >
                  {p.userName}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-surface-dark-3">
                  <span className="text-2xl">⬡</span>
                </div>
                <p className="text-sm text-gray-500">
                  Drag nodes from the left panel to start building
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Or press Ctrl+S to save an empty strategy
                </p>
              </div>
            </div>
          )}

          {/* Validation panel overlay */}
          {showValidation && validationResult && (
            <ValidationPanel
              result={validationResult}
              onClose={() => setShowValidation(false)}
            />
          )}

          {/* Version history modal */}
          {showHistory && (
            <VersionHistoryModal
              strategyId={strategyId}
              currentDag={toDAG()}
              onClose={() => setShowHistory(false)}
              onRestore={handleRestoreFromVersion}
            />
          )}
        </div>

        {/* Right: Node inspector */}
        <NodeInspector />
      </div>
    </div>
  );
}

/** Wraps with ReactFlowProvider + resets store on unmount */
export function StrategyCanvas(props: StrategyCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
