"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Drawdown Chart
// Recharts AreaChart with red gradient and GSAP animation
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
  ReferenceLine,
} from "recharts";
import gsap from "gsap";

interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  cash: number;
}

interface DrawdownChartProps {
  data: EquityPoint[];
  maxDrawdown?: number;
}

export function DrawdownChart({ data, maxDrawdown }: DrawdownChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const chartData = data.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    drawdown: -(d.drawdown * 100), // negative for visual
    timestamp: d.timestamp,
  }));

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;
    gsap.from(containerRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: "power3.out",
      delay: 0.2,
    });
  }, [data]);

  const maxDDValue = maxDrawdown ? -(maxDrawdown * 100) : undefined;

  return (
    <div ref={containerRef} className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Drawdown</h3>
        {maxDrawdown !== undefined && (
          <span className="text-[10px] font-semibold text-red-400">
            Max: {(maxDrawdown * 100).toFixed(2)}%
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
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
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2d2d3a" }}
            domain={["dataMin", 0]}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a2e",
              border: "1px solid #2d2d3a",
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
          />
          {maxDDValue !== undefined && (
            <ReferenceLine
              y={maxDDValue}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          )}
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#drawdownGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
