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
import { useCanvasStore } from "../../lib/canvas-store";
import { validateDAG } from "../../lib/dag-validator";
import { StrategyNodeComponent } from "./StrategyNode";
import { NodePalette } from "./NodePalette";
import { NodeInspector } from "./NodeInspector";
import { CanvasToolbar } from "./CanvasToolbar";
import { ValidationPanel } from "./ValidationPanel";
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

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
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

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
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

  const validationErrorCount = validationResult?.errors.length ?? 0;

  return (
    <div className="flex h-full flex-col bg-surface-dark-0">
      {/* Toolbar */}
      <CanvasToolbar
        onSave={handleSave}
        onValidate={handleValidate}
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
        >
          <ReactFlow
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
