"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Backtest Config Panel
// Slide-out panel for configuring and submitting a backtest
// GSAP animated entrance/exit
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Play, X, Zap, Calendar, DollarSign, BarChart3, Settings2 } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { useCanvasStore } from "../../lib/canvas-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BacktestConfigPanelProps {
  onClose: () => void;
  strategyId: string;
}

export function BacktestConfigPanel({ onClose, strategyId }: BacktestConfigPanelProps) {
  const router = useRouter();

  const [symbols, setSymbols] = useState("AAPL");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-01-01");
  const [resolution, setResolution] = useState<"daily" | "minute">("daily");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [slippageType, setSlippageType] = useState("percentage");
  const [slippageValue, setSlippageValue] = useState(0.1);
  const [makerFee, setMakerFee] = useState(0.001);
  const [takerFee, setTakerFee] = useState(0.002);

  const toDAG = useCanvasStore((s: any) => s.toDAG);
  const submitMutation = trpc.backtest.submit.useMutation();
  const estimateQuery = trpc.backtest.estimateCredits.useQuery(
    {
      config: {
        symbols: symbols.split(",").map((s) => s.trim()),
        startDate,
        endDate,
        resolution,
        initialCapital,
        slippage: { type: slippageType as any, value: slippageValue },
        fees: { makerFee, takerFee },
      },
    },
    { refetchOnWindowFocus: false }
  );

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    console.info("[backtest] submit clicked", {
      strategyId,
      symbols,
      startDate,
      endDate,
      resolution,
    });
    toast.loading("Submitting backtest...", { id: "backtest-submit" });
    try {
      const result = await submitMutation.mutateAsync({
        strategyId,
        config: {
          symbols: symbols.split(",").map((s) => s.trim()),
          startDate,
          endDate,
          resolution,
          initialCapital,
          slippage: { type: slippageType as any, value: slippageValue },
          fees: { makerFee, takerFee },
        },
      });

      handleClose();
      console.info("[backtest] submitted", { backtestId: result.backtestId, cached: result.cached });
      toast.dismiss("backtest-submit");
      toast.success("Backtest started", {
        description: "Opening live result page...",
      });
      router.push(`/backtests/${result.backtestId}`);
    } catch (err) {
      console.error("Backtest submission failed:", err);
      toast.dismiss("backtest-submit");
      const message =
        err instanceof Error ? err.message : "Could not start backtest. Please try again.";
      toast.error("Backtest failed", { description: message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-stretch justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md overflow-y-auto border-l border-surface-dark-3 bg-surface-dark-1 shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-dark-3 bg-surface-dark-1/95 backdrop-blur-sm px-5 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-semibold text-white">Configure Backtest</span>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-surface-dark-2 hover:text-gray-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Symbols */}
          <FieldGroup icon={<BarChart3 className="h-3.5 w-3.5" />} label="Symbols">
            <input
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="AAPL, MSFT, SPY"
              className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500/50 focus:outline-none transition-colors"
            />
            <p className="mt-1 text-[10px] text-gray-500">Comma-separated ticker symbols</p>
          </FieldGroup>

          {/* Date Range */}
          <FieldGroup icon={<Calendar className="h-3.5 w-3.5" />} label="Date Range">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-sm text-white focus:border-brand-500/50 focus:outline-none transition-colors"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-sm text-white focus:border-brand-500/50 focus:outline-none transition-colors"
              />
            </div>
          </FieldGroup>

          {/* Resolution */}
          <FieldGroup icon={<Settings2 className="h-3.5 w-3.5" />} label="Resolution">
            <div className="grid grid-cols-2 gap-2">
              {(["daily", "minute"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                    resolution === res
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-300"
                      : "border-surface-dark-3 bg-surface-dark-2 text-gray-400 hover:bg-surface-dark-3"
                  }`}
                >
                  {res === "daily" ? "📅 Daily" : "⏱️ Minute"}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Initial Capital */}
          <FieldGroup icon={<DollarSign className="h-3.5 w-3.5" />} label="Initial Capital">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 pl-8 pr-3 py-2 text-sm text-white focus:border-brand-500/50 focus:outline-none transition-colors"
              />
            </div>
          </FieldGroup>

          {/* Slippage */}
          <FieldGroup icon={<Zap className="h-3.5 w-3.5" />} label="Slippage Model">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={slippageType}
                onChange={(e) => setSlippageType(e.target.value)}
                className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="fixed">Fixed ($)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="market_impact">Market Impact</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={slippageValue}
                onChange={(e) => setSlippageValue(Number(e.target.value))}
                className="rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </FieldGroup>

          {/* Fees */}
          <FieldGroup icon={<DollarSign className="h-3.5 w-3.5" />} label="Fee Schedule">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">Maker Fee</label>
                <input
                  type="number"
                  step="0.001"
                  value={makerFee}
                  onChange={(e) => setMakerFee(Number(e.target.value))}
                  className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-1.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Taker Fee</label>
                <input
                  type="number"
                  step="0.001"
                  value={takerFee}
                  onChange={(e) => setTakerFee(Number(e.target.value))}
                  className="w-full rounded-lg border border-surface-dark-3 bg-surface-dark-2 px-3 py-1.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
          </FieldGroup>

          {/* Credit Estimate */}
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Estimated Credits</span>
              <span className="text-sm font-bold text-brand-300">
                {estimateQuery.data?.credits ?? "—"} credits
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {submitMutation.isPending ? "Starting Backtest…" : "Run Backtest"}
          </button>

          {submitMutation.error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {submitMutation.error.message}
            </div>
          )}

          {submitMutation.data?.cached && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
              ✅ Identical backtest found — using cached result
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-300">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
