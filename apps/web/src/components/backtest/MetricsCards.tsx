"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Metrics Cards
// Grid of animated metric values with GSAP counter animation
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  Percent,
  Clock,
  Zap,
} from "lucide-react";

interface Metrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeDuration: number;
  volatility: number;
}

interface MetricsCardsProps {
  metrics: Metrics;
}

interface MetricCardConfig {
  label: string;
  value: number;
  format: "percent" | "ratio" | "count" | "days";
  icon: React.ReactNode;
  positive: "higher" | "lower";
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const cards: MetricCardConfig[] = [
    { label: "Total Return", value: metrics.totalReturn * 100, format: "percent", icon: <TrendingUp className="h-4 w-4" />, positive: "higher" },
    { label: "Annualized Return", value: metrics.annualizedReturn * 100, format: "percent", icon: <BarChart3 className="h-4 w-4" />, positive: "higher" },
    { label: "Sharpe Ratio", value: metrics.sharpeRatio, format: "ratio", icon: <Target className="h-4 w-4" />, positive: "higher" },
    { label: "Sortino Ratio", value: metrics.sortinoRatio, format: "ratio", icon: <Activity className="h-4 w-4" />, positive: "higher" },
    { label: "Calmar Ratio", value: metrics.calmarRatio, format: "ratio", icon: <Zap className="h-4 w-4" />, positive: "higher" },
    { label: "Max Drawdown", value: metrics.maxDrawdown * 100, format: "percent", icon: <TrendingDown className="h-4 w-4" />, positive: "lower" },
    { label: "Win Rate", value: metrics.winRate * 100, format: "percent", icon: <Percent className="h-4 w-4" />, positive: "higher" },
    { label: "Profit Factor", value: metrics.profitFactor, format: "ratio", icon: <Target className="h-4 w-4" />, positive: "higher" },
    { label: "Total Trades", value: metrics.totalTrades, format: "count", icon: <BarChart3 className="h-4 w-4" />, positive: "higher" },
    { label: "Volatility", value: metrics.volatility * 100, format: "percent", icon: <Activity className="h-4 w-4" />, positive: "lower" },
  ];

  useEffect(() => {
    if (!gridRef.current) return;

    const cardEls = gridRef.current.querySelectorAll(".metric-card");
    gsap.from(cardEls, {
      opacity: 0,
      y: 25,
      scale: 0.95,
      duration: 0.5,
      stagger: 0.06,
      ease: "power3.out",
    });

    // Counter animation for each value
    const valueEls = gridRef.current.querySelectorAll(".metric-value");
    valueEls.forEach((el, i) => {
      const target = cards[i].value;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        delay: 0.3 + i * 0.06,
        ease: "power2.out",
        onUpdate: () => {
          (el as HTMLElement).textContent = formatValue(obj.val, cards[i].format);
        },
      });
    });
  }, [metrics]);

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const isGood = card.positive === "higher" ? card.value > 0 : card.value < 10;
        const colorClass = isGood ? "text-emerald-400" : "text-red-400";
        const bgClass = isGood
          ? "border-emerald-500/15 bg-emerald-500/5"
          : "border-red-500/15 bg-red-500/5";

        return (
          <div
            key={card.label}
            className={`metric-card rounded-xl border ${bgClass} p-3 transition-all hover:scale-[1.02]`}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className={colorClass}>{card.icon}</span>
              <span className="text-[10px] font-medium text-gray-400">{card.label}</span>
            </div>
            <div className={`metric-value text-lg font-bold ${colorClass}`}>
              {formatValue(card.value, card.format)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(val: number, format: string): string {
  switch (format) {
    case "percent":
      return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    case "ratio":
      return val.toFixed(2);
    case "count":
      return Math.round(val).toString();
    case "days":
      return `${val.toFixed(1)}d`;
    default:
      return val.toFixed(2);
  }
}
