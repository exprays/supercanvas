"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Validation Panel
// Bottom overlay showing DAG validation errors/warnings
// ─────────────────────────────────────────────

import { X, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidationResult } from "../../lib/dag-validator";

interface ValidationPanelProps {
  result: ValidationResult;
  onClose: () => void;
}

export function ValidationPanel({ result, onClose }: ValidationPanelProps) {
  const hasIssues = result.errors.length > 0 || result.warnings.length > 0;

  return (
    <div className="absolute bottom-4 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-surface-dark-3 bg-surface-dark-1 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-dark-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {result.valid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span className="text-sm font-semibold text-white">
            {result.valid ? "Strategy looks good!" : "Validation Issues"}
          </span>
          {!result.valid && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
            </span>
          )}
          {result.warnings.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              {result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Issues list */}
      {hasIssues && (
        <div className="max-h-48 overflow-y-auto px-4 py-3 space-y-2">
          {result.errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-300">{err.message}</span>
            </div>
          ))}
          {result.warnings.map((warn, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="text-xs text-amber-300">{warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* All clear */}
      {!hasIssues && (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400">
            No issues found. This strategy is ready to backtest.
            {result.executionOrder && (
              <span className="ml-1 text-gray-600">
                ({result.executionOrder.length} nodes in execution order)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
