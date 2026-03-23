"use client";

// ─────────────────────────────────────────────
// SuperCanvas — Trade Log Table
// GSAP staggered row entrance, sortable columns, colour-coded P&L
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

interface Trade {
  timestamp: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  fees: number;
  slippage: number;
  pnl: number;
}

interface TradeLogTableProps {
  trades: Trade[];
}

type SortKey = keyof Trade;
type SortDir = "asc" | "desc";

export function TradeLogTable({ trades }: TradeLogTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...trades].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  useEffect(() => {
    if (!tableRef.current) return;

    const rows = tableRef.current.querySelectorAll("tbody tr");
    gsap.from(rows, {
      opacity: 0,
      x: -15,
      duration: 0.3,
      stagger: 0.03,
      ease: "power2.out",
    });
  }, [trades, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-gray-600" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-brand-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-400" />
    );
  };

  const columns: { key: SortKey; label: string; align?: string }[] = [
    { key: "timestamp", label: "Date" },
    { key: "symbol", label: "Symbol" },
    { key: "side", label: "Side" },
    { key: "quantity", label: "Qty", align: "right" },
    { key: "price", label: "Price", align: "right" },
    { key: "fees", label: "Fees", align: "right" },
    { key: "slippage", label: "Slip", align: "right" },
    { key: "pnl", label: "P&L", align: "right" },
  ];

  return (
    <div ref={tableRef} className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-dark-3">
        <h3 className="text-sm font-semibold text-white">Trade Log</h3>
        <p className="text-[10px] text-gray-500">{trades.length} trades executed</p>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-dark-2 border-b border-surface-dark-3">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-dark-3/50">
            {sorted.slice(0, 200).map((trade, i) => (
              <tr
                key={`${trade.timestamp}-${i}`}
                className="hover:bg-surface-dark-3/30 transition-colors"
              >
                <td className="px-3 py-2 text-[11px] text-gray-400 whitespace-nowrap">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-[11px] font-medium text-white">
                  {trade.symbol}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      trade.side === "buy"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-300 text-right font-mono">
                  {trade.quantity.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-300 text-right font-mono">
                  ${trade.price.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-500 text-right font-mono">
                  ${trade.fees.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-500 text-right font-mono">
                  ${trade.slippage.toFixed(4)}
                </td>
                <td
                  className={`px-3 py-2 text-[11px] text-right font-mono font-semibold ${
                    trade.pnl > 0
                      ? "text-emerald-400"
                      : trade.pnl < 0
                      ? "text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
