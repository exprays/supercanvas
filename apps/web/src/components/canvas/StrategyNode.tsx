"use client";
// ─────────────────────────────────────────────
// SuperCanvas — StrategyNode Component
// Custom React Flow node — handles all 20 node types via registry
// ─────────────────────────────────────────────

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Lock } from "lucide-react";
import { NODE_REGISTRY, PORT_COLORS } from "@supercanvas/types";
import { cn } from "@supercanvas/ui";
import { useCanvasStore } from "../../lib/canvas-store";
import * as LucideIcons from "lucide-react";

interface NodeData {
  type: string;
  label: string;
  params: Record<string, unknown>;
  lockedBy?: string;
}

const CATEGORY_BORDER: Record<string, string> = {
  data_source: "border-cyan-500/40",
  indicator: "border-blue-500/40",
  signal_logic: "border-yellow-500/40",
  risk_control: "border-red-500/40",
  execution: "border-brand-500/40",
  output: "border-violet-500/40",
  portfolio: "border-amber-500/40",
  ml: "border-purple-500/40",
};

export const StrategyNodeComponent = memo(function StrategyNodeComponent({
  id,
  data,
  selected,
}: NodeProps<NodeData>) {
  const def = NODE_REGISTRY[data.type];
  const selectNode = useCanvasStore((s: any) => s.selectNode);
  const selectedNodeId = useCanvasStore((s: any) => s.selectedNodeId);

  const handleClick = useCallback(() => {
    selectNode(id);
  }, [id, selectNode]);

  if (!def) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-surface-dark-1 px-3 py-2 text-xs text-red-400">
        Unknown: {data.type}
      </div>
    );
  }

  // Dynamic icon lookup
  const IconComponent = (LucideIcons as Record<string, unknown>)[def.icon] as
    | React.ComponentType<{ className?: string }>
    | undefined;

  const isSelected = selected || selectedNodeId === id;
  const isLocked = !!data.lockedBy;
  const borderClass = CATEGORY_BORDER[def.category] ?? "border-surface-dark-3";

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative min-w-[180px] rounded-xl border bg-surface-dark-1 shadow-lg",
        "transition-all duration-150 cursor-pointer select-none",
        isSelected
          ? "border-brand-500 shadow-brand-500/20 shadow-xl ring-1 ring-brand-500/30"
          : borderClass,
        isLocked && "opacity-70"
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-t-xl px-3 py-2",
          def.color,
          "bg-opacity-15"
        )}
      >
        {IconComponent && (
          <IconComponent className="h-3.5 w-3.5 shrink-0 text-white/80" />
        )}
        <span className="text-xs font-semibold text-white/90 truncate">
          {data.label}
        </span>
        {isLocked && (
          <Lock className="ml-auto h-3 w-3 shrink-0 text-yellow-400" />
        )}
      </div>

      {/* ── Input handles ── */}
      <div className="flex flex-col gap-1 px-2 py-2">
        {def.inputs.map((port, i) => (
          <div key={port.id} className="relative flex items-center gap-1.5">
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              style={{
                background: PORT_COLORS[port.dataType],
                width: 10,
                height: 10,
                left: -5,
                top: "50%",
                transform: "translateY(-50%)",
                border: "2px solid #1a1b1e",
              }}
              className="!absolute"
            />
            <span
              className="ml-3 text-[10px] text-gray-400 truncate max-w-[100px]"
              title={port.label}
            >
              {port.label}
            </span>
          </div>
        ))}

        {/* ── Outputs ── */}
        {def.outputs.map((port) => (
          <div key={port.id} className="relative flex items-center justify-end gap-1.5">
            <span
              className="mr-3 text-[10px] text-gray-400 truncate max-w-[100px]"
              title={port.label}
            >
              {port.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              style={{
                background: PORT_COLORS[port.dataType],
                width: 10,
                height: 10,
                right: -5,
                top: "50%",
                transform: "translateY(-50%)",
                border: "2px solid #1a1b1e",
              }}
              className="!absolute"
            />
          </div>
        ))}

        {/* Empty state */}
        {def.inputs.length === 0 && def.outputs.length === 0 && (
          <div className="py-1" />
        )}
      </div>

      {/* ── Param preview (max 2 params shown) ── */}
      {def.params.length > 0 && (
        <div className="border-t border-surface-dark-3 px-3 pb-2 pt-1.5">
          {def.params.slice(0, 2).map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500">{p.label}</span>
              <span className="text-[10px] font-mono text-gray-300">
                {String(data.params[p.key] ?? p.default)}
              </span>
            </div>
          ))}
          {def.params.length > 2 && (
            <div className="text-[9px] text-gray-600 mt-0.5">
              +{def.params.length - 2} more
            </div>
          )}
        </div>
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-brand-500/40" />
      )}
    </div>
  );
});
