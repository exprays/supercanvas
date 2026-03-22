"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Node Palette
// Left sidebar: searchable draggable node list grouped by category
// ─────────────────────────────────────────────

import { useState, useCallback } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { NODE_PALETTE, PORT_COLORS } from "@supercanvas/types";
import type { NodeDef } from "@supercanvas/types";
import { cn } from "@supercanvas/ui";
import * as LucideIcons from "lucide-react";

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const filteredPalette = NODE_PALETTE.map((group) => ({
    ...group,
    nodes: group.nodes.filter(
      (n) =>
        !search ||
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.nodes.length > 0);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-surface-dark-3 bg-surface-dark-1">
      {/* Header */}
      <div className="border-b border-surface-dark-3 px-3 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Nodes
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 py-1.5 pl-8 pr-3 text-xs text-gray-300 placeholder:text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
          />
        </div>
      </div>

      {/* Node groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredPalette.map((group) => {
          const isCollapsed = collapsed.has(group.category);
          return (
            <div key={group.category} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(group.category)}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-surface-dark-2 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-gray-600" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-gray-600" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </span>
                <span className="ml-auto text-[10px] text-gray-600">
                  {group.nodes.length}
                </span>
              </button>

              {/* Nodes */}
              {!isCollapsed && (
                <div className="px-2 pb-1">
                  {group.nodes.map((node) => (
                    <PaletteNode
                      key={node.type}
                      node={node}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="border-t border-surface-dark-3 px-3 py-2">
        <p className="text-[10px] text-gray-600">
          Drag nodes onto the canvas
        </p>
      </div>
    </aside>
  );
}

function PaletteNode({
  node,
  onDragStart,
}: {
  node: NodeDef;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}) {
  const IconComponent = (LucideIcons as Record<string, unknown>)[node.icon] as
    | React.ComponentType<{ className?: string }>
    | undefined;

  // Get the first output port color as accent
  const accentColor =
    node.outputs[0] ? PORT_COLORS[node.outputs[0].dataType] : "#5c7cfa";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      className={cn(
        "group mb-0.5 flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5",
        "border border-transparent hover:border-surface-dark-3 hover:bg-surface-dark-2",
        "active:cursor-grabbing transition-all duration-100"
      )}
      title={node.description}
    >
      {/* Color dot */}
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: accentColor }}
      />

      {/* Icon */}
      {IconComponent && (
        <IconComponent className="h-3.5 w-3.5 shrink-0 text-gray-500 group-hover:text-gray-300 transition-colors" />
      )}

      {/* Label */}
      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors truncate">
        {node.label}
      </span>
    </div>
  );
}
