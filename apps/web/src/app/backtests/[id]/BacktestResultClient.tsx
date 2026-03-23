"use client";
// ─────────────────────────────────────────────
// SuperCanvas — Backtest Result Client
// Full backtest result view with charts, metrics, trade log
// ─────────────────────────────────────────────

import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { trpc } from "../../../lib/trpc";
import { cn } from "@supercanvas/ui";
import { EquityCurveChart } from "../../../components/backtest/EquityCurveChart";
import { DrawdownChart } from "../../../components/backtest/DrawdownChart";
import { MetricsCards } from "../../../components/backtest/MetricsCards";
import { TradeLogTable } from "../../../components/backtest/TradeLogTable";
import { BacktestProgressBar } from "../../../components/backtest/BacktestProgressBar";

interface BacktestResultClientProps {
  backtestId: string;
}

export function BacktestResultClient({ backtestId }: BacktestResultClientProps) {
  const { data: bt, isLoading, error } = trpc.backtest.get.useQuery(
    { id: backtestId },
    { refetchInterval: (query) => {
        const status = query?.state?.data?.status;
        return (status === "running" || status === "queued") ? 3000 : false;
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-dark-0">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !bt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-dark-0">
        <XCircle className="mb-3 h-8 w-8 text-red-400" />
        <p className="text-sm text-gray-400">
          {error?.message ?? "Backtest not found"}
        </p>
        <Link
          href="/backtests"
          className="mt-4 text-xs text-brand-400 hover:text-brand-300"
        >
          ← Back to backtests
        </Link>
      </div>
    );
  }

  const metrics = bt.metricsJson as Record<string, any> | null;
  const equityCurve = (metrics?._equityCurve as any[]) ?? [];
  const trades = (metrics?._trades as any[]) ?? [];
  const config = bt.configJson as Record<string, any> | null;

  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400" },
    running: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-brand-400" },
    queued: { icon: <Clock className="h-4 w-4" />, color: "text-amber-400" },
    failed: { icon: <XCircle className="h-4 w-4" />, color: "text-red-400" },
  };
  const sc = statusConfig[bt.status] ?? statusConfig.queued;

  return (
    <div className="min-h-screen bg-surface-dark-0">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-surface-dark-3 bg-surface-dark-0/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/backtests"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Backtests
            </Link>
            <div className="h-4 w-px bg-surface-dark-3" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-semibold text-white">
                {(config?.symbols as string[])?.join(", ") ?? "Backtest"}
              </span>
            </div>
            <span className={cn("flex items-center gap-1 text-xs font-semibold", sc.color)}>
              {sc.icon}
              {bt.status.toUpperCase()}
            </span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Config summary */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>{config?.resolution ?? "daily"} resolution</span>
          <span>•</span>
          <span>${(config?.initialCapital ?? 100000).toLocaleString()} capital</span>
          <span>•</span>
          <span>
            {config?.startDate} → {config?.endDate}
          </span>
          {bt.creditsUsed && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Zap className="h-3 w-3" />
                {bt.creditsUsed} credits
              </span>
            </>
          )}
        </div>

        {/* Progress bar for running backtests */}
        {(bt.status === "running" || bt.status === "queued") && (
          <BacktestProgressBar
            backtestId={backtestId}
            status={bt.status}
            progress={bt.status === "queued" ? 0 : 50}
          />
        )}

        {/* Failed state */}
        {bt.status === "failed" && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Backtest Failed</span>
            </div>
            <p className="mt-1 text-xs text-red-300/60">
              An error occurred during execution. Try re-running or contact support.
            </p>
          </div>
        )}

        {/* Completed results */}
        {bt.status === "completed" && metrics && (
          <>
            {/* Metrics cards */}
            <MetricsCards
              metrics={{
                totalReturn: metrics.totalReturn ?? 0,
                annualizedReturn: metrics.annualizedReturn ?? 0,
                sharpeRatio: metrics.sharpeRatio ?? 0,
                sortinoRatio: metrics.sortinoRatio ?? 0,
                calmarRatio: metrics.calmarRatio ?? 0,
                maxDrawdown: metrics.maxDrawdown ?? 0,
                winRate: metrics.winRate ?? 0,
                profitFactor: metrics.profitFactor ?? 0,
                totalTrades: metrics.totalTrades ?? 0,
                avgTradeDuration: metrics.avgTradeDuration ?? 0,
                volatility: metrics.volatility ?? 0,
              }}
            />

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-1">
              {equityCurve.length > 0 && (
                <EquityCurveChart
                  data={equityCurve}
                  initialCapital={config?.initialCapital ?? 100000}
                />
              )}
              {equityCurve.length > 0 && (
                <DrawdownChart
                  data={equityCurve}
                  maxDrawdown={metrics.maxDrawdown}
                />
              )}
            </div>

            {/* Trade log */}
            {trades.length > 0 && <TradeLogTable trades={trades} />}
          </>
        )}
      </main>
    </div>
  );
}
