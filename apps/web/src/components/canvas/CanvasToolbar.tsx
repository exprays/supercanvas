"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Canvas Toolbar
// Top bar: strategy name, save status, undo/redo, validate, zoom
// ─────────────────────────────────────────────

import { useCallback, useState } from "react";
import {
  Undo2,
  Redo2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  ChevronLeft,
  History,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useReactFlow } from "reactflow";
import { cn } from "@supercanvas/ui";
import { useCanvasStore } from "../../lib/canvas-store";
import { trpc } from "../../lib/trpc";


type SaveState = "saved" | "saving" | "unsaved" | "error";

interface CanvasToolbarProps {
  onSave: () => Promise<void>;
  onValidate: () => void;
  onOpenHistory: () => void;
  onAutoLayout: () => void;
  onRunBacktest: () => void;
  saveState: SaveState;
  validationErrorCount: number;
}

export function CanvasToolbar({
  onSave,
  onValidate,
  onOpenHistory,
  onAutoLayout,
  onRunBacktest,
  saveState,
  validationErrorCount,
}: CanvasToolbarProps) {
  const { data: userProfile } = trpc.user.me.useQuery();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const isDirty = useCanvasStore((s: any) => s.isDirty);
  const strategyName = useCanvasStore((s: any) => s.strategyName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(strategyName);

  // Undo/redo from the zundo temporal middleware (runtime available; types are intentionally loose).
  const canUndo = useCanvasStore((s: any) => Boolean(s.canUndo));
  const canRedo = useCanvasStore((s: any) => Boolean(s.canRedo));
  const undo = useCanvasStore((s: any) => s.undo as undefined | (() => void));
  const redo = useCanvasStore((s: any) => s.redo as undefined | (() => void));

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
    useCanvasStore.setState({ strategyName: nameValue });
  }, [nameValue]);

  const handleSave = useCallback(async () => {
    await onSave();
  }, [onSave]);

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-surface-dark-3 bg-surface-dark-0/80 px-3 backdrop-blur-xl">
      {/* Back */}
      <Link
        href="/strategies"
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Strategies
      </Link>

      <div className="h-4 w-px bg-surface-dark-3" />

      {/* Strategy name */}
      {isEditingName ? (
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
          className="rounded border border-brand-500/50 bg-surface-dark-2 px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-brand-500/30 w-48"
        />
      ) : (
        <button
          onClick={() => setIsEditingName(true)}
          className="rounded px-2 py-1 text-sm font-semibold text-white hover:bg-surface-dark-2 transition-colors"
        >
          {strategyName}
        </button>
      )}

      {/* Save state indicator */}
      <div className="flex items-center gap-1.5">
        {saveState === "saved" && !isDirty && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-500">
            <CheckCircle2 className="h-3 w-3" />
            Saved
          </span>
        )}
        {saveState === "saving" && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {(saveState === "unsaved" || isDirty) && saveState !== "saving" && (
          <span className="text-[11px] text-gray-500">Unsaved changes</span>
        )}
        {saveState === "error" && (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3" />
            Save failed
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => {
            undo?.();
            useCanvasStore.setState({ isDirty: true });
          }}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            redo?.();
            useCanvasStore.setState({ isDirty: true });
          }}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div className="h-4 w-px bg-surface-dark-3" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => zoomOut()} title="Zoom Out">
          <ZoomOut className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => zoomIn()} title="Zoom In">
          <ZoomIn className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => fitView({ padding: 0.1 })} title="Fit to View">
          <Maximize2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div className="h-4 w-px bg-surface-dark-3" />

      {/* Validate */}
      <button
        onClick={onValidate}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
          validationErrorCount > 0
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            : "bg-surface-dark-2 text-gray-400 hover:bg-surface-dark-3 hover:text-gray-200"
        )}
      >
        {validationErrorCount > 0 && (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
        {validationErrorCount > 0 ? `${validationErrorCount} errors` : "Validate"}
      </button>

      {/* History */}
      <button
        onClick={onOpenHistory}
        className="flex items-center gap-1.5 rounded-lg bg-surface-dark-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-surface-dark-3 transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        History
      </button>

      {/* Auto-layout */}
      <button
        onClick={onAutoLayout}
        className="flex items-center gap-1.5 rounded-lg bg-surface-dark-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-surface-dark-3 transition-colors"
      >
        Auto-layout
      </button>

      {/* Credits */}
      {userProfile && (
        <div className="flex items-center gap-1.5 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
          <Zap className="h-3.5 w-3.5" />
          {userProfile.creditsRemaining} credits
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saveState === "saving"}
        className="flex items-center gap-1.5 rounded-lg bg-surface-dark-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-surface-dark-3 transition-colors disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </button>

      {/* Run Backtest */}
      <button
        onClick={onRunBacktest}
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
      >
        <Play className="h-3.5 w-3.5" />
        Run Backtest
      </button>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded p-1.5 text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
