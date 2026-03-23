"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Backtest Progress Bar
// Real-time progress indicator via Convex subscription
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface BacktestProgressBarProps {
  backtestId: string;
  status: string;
  progress: number;
  currentDate?: string;
  onComplete?: () => void;
}

export function BacktestProgressBar({
  backtestId,
  status,
  progress,
  currentDate,
  onComplete,
}: BacktestProgressBarProps) {
  useEffect(() => {
    if (progress >= 100 && status === "completed") {
      onComplete?.();
    }
  }, [progress, status, onComplete]);

  const statusConfig = {
    queued: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-400", label: "Queued" },
    running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "text-brand-400", label: "Running" },
    completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-400", label: "Completed" },
    failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400", label: "Failed" },
  }[status] ?? { icon: <Loader2 className="h-3.5 w-3.5" />, color: "text-gray-400", label: status };

  return (
    <div
      className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 px-4 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-1.5 ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="text-xs font-semibold">{statusConfig.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {currentDate && (
            <span className="text-[10px] text-gray-500">
              Processing: {currentDate}
            </span>
          )}
          <span className="text-xs font-mono text-gray-300">
            {progress.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress bar track */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-dark-3">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
            progress >= 100 && status === "completed"
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-brand-600 to-brand-400"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {/* Animated shimmer */}
        {status === "running" && (
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        )}
      </div>
    </div>
  );
}
