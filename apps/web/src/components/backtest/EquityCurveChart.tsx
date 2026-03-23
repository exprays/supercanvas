"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Equity Curve Chart
// Recharts AreaChart with GSAP animated entrance
// ─────────────────────────────────────────────

import { useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import gsap from "gsap";

interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  cash: number;
}

interface EquityCurveChartProps {
  data: EquityPoint[];
  initialCapital?: number;
}

export function EquityCurveChart({ data, initialCapital = 100000 }: EquityCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    gsap.from(containerRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: "power3.out",
    });

    // Animate the chart paths
    const paths = containerRef.current.querySelectorAll(".recharts-area-area, .recharts-area-curve");
    paths.forEach((path) => {
      const length = (path as SVGPathElement).getTotalLength?.() ?? 1000;
      gsap.fromTo(
        path,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.5, ease: "power2.out", delay: 0.3 }
      );
    });
  }, [data]);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDollar = (val: number) => {
    return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  // Add benchmark line (buy & hold)
  const benchmarkData = data.map((d, i) => ({
    ...d,
    benchmark: initialCapital + (initialCapital * 0.12 * (i / Math.max(data.length - 1, 1))), // 12% annual return
    date: formatDate(d.timestamp),
  }));

  return (
    <div ref={containerRef} className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            <span className="text-gray-400">Strategy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-500" />
            <span className="text-gray-400">Benchmark</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={benchmarkData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2d2d3a" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatDollar}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2d2d3a" }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #2d2d3a",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value: any, name: any) => [
              formatDollar(Number(value)),
              name === "equity" ? "Strategy" : "Benchmark",
            ]}
          />
          <Area
            type="monotone"
            dataKey="benchmark"
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
