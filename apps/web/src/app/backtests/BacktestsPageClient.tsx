"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Backtests List Page Client
// Card grid of all backtests with status, metrics, navigation
// ─────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Clock,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Play,
  TrendingUp,
  TrendingDown,
  Zap,
  Filter,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { trpc } from "../../lib/trpc";
import { cn } from "@supercanvas/ui";
import { formatDistanceToNow } from "date-fns";

type StatusFilter = "all" | "completed" | "running" | "queued" | "failed";

export function BacktestsPageClient() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: userProfile } = trpc.user.me.useQuery();
  const { data, isLoading } = trpc.backtest.list.useQuery({
    limit: 50,
  });

  const backtests = data?.backtests ?? [];
  const filtered =
    statusFilter === "all"
      ? backtests
      : backtests.filter((bt) => bt.status === statusFilter);

  const statusCounts = {
    all: backtests.length,
    completed: backtests.filter((b) => b.status === "completed").length,
    running: backtests.filter((b) => b.status === "running").length,
    queued: backtests.filter((b) => b.status === "queued").length,
    failed: backtests.filter((b) => b.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-surface-dark-0">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-surface-dark-3 bg-surface-dark-0/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-4 w-px bg-surface-dark-3" />
            <span className="text-sm font-semibold text-white">Backtests</span>
          </div>
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="badge-info flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                {userProfile.creditsRemaining} credits
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Backtest History</h1>
          <p className="mt-1 text-sm text-gray-500">
            {backtests.length} backtest{backtests.length === 1 ? "" : "s"} total
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-surface-dark-3 bg-surface-dark-1 p-1 w-fit">
          {(
            [
              { key: "all", label: "All" },
              { key: "completed", label: "Completed", icon: <CheckCircle2 className="h-3 w-3" /> },
              { key: "running", label: "Running", icon: <Play className="h-3 w-3" /> },
              { key: "queued", label: "Queued", icon: <Clock className="h-3 w-3" /> },
              { key: "failed", label: "Failed", icon: <XCircle className="h-3 w-3" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                statusFilter === tab.key
                  ? "bg-surface-dark-3 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {tab.key !== "all" && tab.icon}
              {tab.label}
              <span className="ml-1 text-[10px] text-gray-600">
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Backtest grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-surface-dark-3">
              <BarChart3 className="h-7 w-7 text-gray-600" />
            </div>
            <p className="mb-1 text-sm font-medium text-gray-400">
              {statusFilter === "all"
                ? "No backtests yet"
                : `No ${statusFilter} backtests`}
            </p>
            <p className="text-xs text-gray-600">
              Run a backtest from the canvas to see results here
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((bt) => (
              <BacktestCard key={bt.id} backtest={bt} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Backtest Card ─────────────────────────────────────────────────────────

function BacktestCard({
  backtest,
}: {
  backtest: {
    id: string;
    strategyId: string;
    status: string;
    resolution: string | null;
    metricsJson: any;
    configJson: any;
    creditsUsed: number | null;
    createdAt: Date;
    completedAt: Date | null;
  };
}) {
  const metrics = backtest.metricsJson as Record<string, number> | null;
  const config = backtest.configJson as Record<string, any> | null;
  const symbols = config?.symbols?.join(", ") ?? "—";

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    completed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    running: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      color: "text-brand-400",
      bg: "bg-brand-500/10 border-brand-500/20",
    },
    queued: {
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
  };

  const sc = statusConfig[backtest.status] ?? statusConfig.queued;
  const totalReturn = metrics?.totalReturn;
  const isPositive = (totalReturn ?? 0) >= 0;

  return (
    <Link
      href={`/backtests/${backtest.id}`}
      className={cn(
        "group flex flex-col rounded-xl border border-surface-dark-3 bg-surface-dark-1 p-5",
        "hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5",
        "transition-all duration-200"
      )}
    >
      {/* Status badge + time */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            sc.bg,
            sc.color
          )}
        >
          {sc.icon}
          {backtest.status.toUpperCase()}
        </span>
        <span className="text-[10px] text-gray-600">
          {formatDistanceToNow(new Date(backtest.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Symbols */}
      <div className="mb-1 flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-brand-400" />
        <span className="text-sm font-semibold text-white">{symbols}</span>
      </div>

      {/* Resolution + credits */}
      <div className="mb-3 flex items-center gap-3 text-[10px] text-gray-500">
        <span>{backtest.resolution ?? "daily"}</span>
        {backtest.creditsUsed && (
          <>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              {backtest.creditsUsed} credits
            </span>
          </>
        )}
      </div>

      {/* Key metrics (only for completed) */}
      {backtest.status === "completed" && metrics && (
        <div className="mt-auto grid grid-cols-3 gap-2">
          <MetricMini
            label="Return"
            value={`${isPositive ? "+" : ""}${((totalReturn ?? 0) * 100).toFixed(1)}%`}
            positive={isPositive}
          />
          <MetricMini
            label="Sharpe"
            value={(metrics.sharpeRatio ?? 0).toFixed(2)}
            positive={(metrics.sharpeRatio ?? 0) > 0}
          />
          <MetricMini
            label="Max DD"
            value={`${((metrics.maxDrawdown ?? 0) * 100).toFixed(1)}%`}
            positive={(metrics.maxDrawdown ?? 0) < 0.1}
          />
        </div>
      )}
    </Link>
  );
}

function MetricMini({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-dark-2 px-2 py-1.5 text-center">
      <div className="text-[9px] text-gray-600">{label}</div>
      <div
        className={cn(
          "text-xs font-bold",
          positive ? "text-emerald-400" : "text-red-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}
