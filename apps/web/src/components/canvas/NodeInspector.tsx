"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Node Inspector
// Right panel: edit params of the selected node
// ─────────────────────────────────────────────

import { useCallback } from "react";
import { X, Trash2, Info } from "lucide-react";
import { NODE_REGISTRY } from "@supercanvas/types";
import { cn } from "@supercanvas/ui";
import { useCanvasStore } from "../../lib/canvas-store";

export function NodeInspector() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const selectNode = useCanvasStore((s) => s.selectNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="flex h-full w-60 shrink-0 flex-col border-l border-surface-dark-3 bg-surface-dark-1">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="rounded-xl bg-surface-dark-2 p-4">
            <Info className="h-6 w-6 text-gray-600" />
          </div>
          <p className="text-xs text-gray-500">
            Select a node to inspect and edit its parameters
          </p>
        </div>
      </aside>
    );
  }

  const def = NODE_REGISTRY[selectedNode.data.type];
  if (!def) return null;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-l border-surface-dark-3 bg-surface-dark-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-dark-3 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", def.color)} />
          <span className="text-sm font-semibold text-white">{def.label}</span>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="rounded p-1 text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Description */}
      <div className="border-b border-surface-dark-3 px-3 py-2">
        <p className="text-[11px] text-gray-500">{def.description}</p>
      </div>

      {/* Params */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {def.params.length === 0 ? (
          <p className="text-xs text-gray-600">No parameters</p>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Parameters
            </p>
            {def.params.map((param) => (
              <ParamField
                key={param.key}
                param={param}
                value={selectedNode.data.params[param.key] ?? param.default}
                onChange={(val) =>
                  updateNodeParams(selectedNode.id, { [param.key]: val })
                }
              />
            ))}
          </div>
        )}

        {/* Port info */}
        {(def.inputs.length > 0 || def.outputs.length > 0) && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Ports
            </p>
            {def.inputs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-gray-500">→ {p.label}</span>
                <span className="rounded bg-surface-dark-2 px-1.5 py-0.5 font-mono text-[9px] text-gray-400">
                  {p.dataType}
                </span>
              </div>
            ))}
            {def.outputs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-gray-500">← {p.label}</span>
                <span className="rounded bg-surface-dark-2 px-1.5 py-0.5 font-mono text-[9px] text-gray-400">
                  {p.dataType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete footer */}
      <div className="border-t border-surface-dark-3 p-3">
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Node
        </button>
      </div>
    </aside>
  );
}

// ── Individual param field ─────────────────────────────────────────────────

interface ParamFieldProps {
  param: { key: string; label: string; type: string; default: unknown; options?: { label: string; value: string | number }[]; min?: number; max?: number; step?: number };
  value: unknown;
  onChange: (val: unknown) => void;
}

function ParamField({ param, value, onChange }: ParamFieldProps) {
  const inputClass =
    "w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-2.5 py-1.5 text-xs text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20";

  return (
    <div className="space-y-1">
      <label className="block text-[11px] text-gray-400">{param.label}</label>

      {param.type === "select" && param.options ? (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          {param.options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : param.type === "boolean" ? (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-surface-dark-3 bg-surface-dark-2 text-brand-500"
          />
          <span className="text-xs text-gray-400">Enabled</span>
        </label>
      ) : (
        <input
          type="number"
          value={Number(value)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          className={inputClass}
        />
      )}
    </div>
  );
}
