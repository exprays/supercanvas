// ─────────────────────────────────────────────
// SuperCanvas — Node Registry
// Defines all 20 base nodes for Phase 1 canvas
// Each node: category, ports (typed), params, display config
// ─────────────────────────────────────────────

import type { NodeCategory, PortDataType } from "./index";

export interface PortDef {
  id: string;
  label: string;
  dataType: PortDataType;
  required: boolean;
}

export interface ParamDef {
  key: string;
  label: string;
  type: "number" | "string" | "boolean" | "select";
  default: unknown;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface NodeDef {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  /** Tailwind color class for the node header accent */
  color: string;
  icon: string; // lucide icon name
}

// ── DATA SOURCE NODES ─────────────────────────────────────────────────────

export const OHLCV_FEED: NodeDef = {
  type: "ohlcv_feed",
  category: "data_source",
  label: "OHLCV Feed",
  description: "Historical OHLCV market data for a symbol",
  inputs: [],
  outputs: [
    { id: "ohlcv", label: "OHLCV", dataType: "time_series", required: false },
  ],
  params: [
    {
      key: "symbol",
      label: "Symbol",
      type: "string",
      default: "AAPL",
      description: "Ticker symbol (e.g. AAPL, RELIANCE.NS)",
    },
    {
      key: "timeframe",
      label: "Timeframe",
      type: "select",
      default: "1d",
      options: [
        { label: "1 Day", value: "1d" },
        { label: "1 Hour", value: "1h" },
        { label: "15 Min", value: "15m" },
        { label: "5 Min", value: "5m" },
        { label: "1 Min", value: "1m" },
      ],
    },
  ],
  color: "bg-cyan-500",
  icon: "Database",
};

// ── INDICATOR NODES ───────────────────────────────────────────────────────

export const SMA_NODE: NodeDef = {
  type: "sma",
  category: "indicator",
  label: "SMA",
  description: "Simple Moving Average",
  inputs: [
    { id: "series", label: "Series", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "sma", label: "SMA", dataType: "float_series", required: false },
  ],
  params: [
    {
      key: "period",
      label: "Period",
      type: "number",
      default: 20,
      min: 2,
      max: 500,
      step: 1,
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "close",
      options: [
        { label: "Close", value: "close" },
        { label: "Open", value: "open" },
        { label: "High", value: "high" },
        { label: "Low", value: "low" },
        { label: "HL/2", value: "hl2" },
      ],
    },
  ],
  color: "bg-blue-500",
  icon: "TrendingUp",
};

export const EMA_NODE: NodeDef = {
  type: "ema",
  category: "indicator",
  label: "EMA",
  description: "Exponential Moving Average",
  inputs: [
    { id: "series", label: "Series", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "ema", label: "EMA", dataType: "float_series", required: false },
  ],
  params: [
    {
      key: "period",
      label: "Period",
      type: "number",
      default: 20,
      min: 2,
      max: 500,
      step: 1,
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "close",
      options: [
        { label: "Close", value: "close" },
        { label: "Open", value: "open" },
        { label: "High", value: "high" },
        { label: "Low", value: "low" },
      ],
    },
  ],
  color: "bg-blue-400",
  icon: "TrendingUp",
};

export const RSI_NODE: NodeDef = {
  type: "rsi",
  category: "indicator",
  label: "RSI",
  description: "Relative Strength Index",
  inputs: [
    { id: "series", label: "Series", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "rsi", label: "RSI", dataType: "float_series", required: false },
  ],
  params: [
    {
      key: "period",
      label: "Period",
      type: "number",
      default: 14,
      min: 2,
      max: 100,
      step: 1,
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "close",
      options: [
        { label: "Close", value: "close" },
        { label: "Open", value: "open" },
        { label: "High", value: "high" },
        { label: "Low", value: "low" },
      ],
    },
  ],
  color: "bg-purple-500",
  icon: "Activity",
};

export const MACD_NODE: NodeDef = {
  type: "macd",
  category: "indicator",
  label: "MACD",
  description: "Moving Average Convergence Divergence",
  inputs: [
    { id: "series", label: "Series", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "macd", label: "MACD", dataType: "float_series", required: false },
    { id: "signal", label: "Signal", dataType: "float_series", required: false },
    { id: "histogram", label: "Histogram", dataType: "float_series", required: false },
  ],
  params: [
    { key: "fast_period", label: "Fast Period", type: "number", default: 12, min: 2, max: 100 },
    { key: "slow_period", label: "Slow Period", type: "number", default: 26, min: 2, max: 200 },
    { key: "signal_period", label: "Signal Period", type: "number", default: 9, min: 2, max: 100 },
  ],
  color: "bg-indigo-500",
  icon: "BarChart2",
};

export const BOLLINGER_NODE: NodeDef = {
  type: "bollinger",
  category: "indicator",
  label: "Bollinger Bands",
  description: "Bollinger Bands with configurable std dev",
  inputs: [
    { id: "series", label: "Series", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "upper", label: "Upper", dataType: "float_series", required: false },
    { id: "middle", label: "Middle", dataType: "float_series", required: false },
    { id: "lower", label: "Lower", dataType: "float_series", required: false },
  ],
  params: [
    { key: "period", label: "Period", type: "number", default: 20, min: 2, max: 200 },
    { key: "std_dev", label: "Std Dev", type: "number", default: 2, min: 0.5, max: 4, step: 0.5 },
  ],
  color: "bg-teal-500",
  icon: "Layers",
};

export const VWAP_NODE: NodeDef = {
  type: "vwap",
  category: "indicator",
  label: "VWAP",
  description: "Volume Weighted Average Price",
  inputs: [
    { id: "ohlcv", label: "OHLCV", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "vwap", label: "VWAP", dataType: "float_series", required: false },
  ],
  params: [
    {
      key: "anchor",
      label: "Anchor",
      type: "select",
      default: "session",
      options: [
        { label: "Session", value: "session" },
        { label: "Week", value: "week" },
        { label: "Month", value: "month" },
      ],
    },
  ],
  color: "bg-cyan-600",
  icon: "BarChart",
};

export const ATR_NODE: NodeDef = {
  type: "atr",
  category: "indicator",
  label: "ATR",
  description: "Average True Range — measures volatility",
  inputs: [
    { id: "ohlcv", label: "OHLCV", dataType: "time_series", required: true },
  ],
  outputs: [
    { id: "atr", label: "ATR", dataType: "float_series", required: false },
  ],
  params: [
    { key: "period", label: "Period", type: "number", default: 14, min: 1, max: 100 },
  ],
  color: "bg-orange-500",
  icon: "Waves",
};

// ── SIGNAL LOGIC NODES ────────────────────────────────────────────────────

export const COMPARATOR_NODE: NodeDef = {
  type: "comparator",
  category: "signal_logic",
  label: "Comparator",
  description: "Compare two series and emit a boolean signal",
  inputs: [
    { id: "a", label: "A", dataType: "float_series", required: true },
    { id: "b", label: "B", dataType: "float_series", required: true },
  ],
  outputs: [
    { id: "signal", label: "Signal", dataType: "boolean_signal", required: false },
  ],
  params: [
    {
      key: "operator",
      label: "Operator",
      type: "select",
      default: "gt",
      options: [
        { label: "A > B", value: "gt" },
        { label: "A < B", value: "lt" },
        { label: "A ≥ B", value: "gte" },
        { label: "A ≤ B", value: "lte" },
        { label: "A = B", value: "eq" },
      ],
    },
  ],
  color: "bg-yellow-500",
  icon: "GitCompare",
};

export const THRESHOLD_NODE: NodeDef = {
  type: "threshold",
  category: "signal_logic",
  label: "Threshold",
  description: "Emit signal when series crosses a fixed threshold",
  inputs: [
    { id: "series", label: "Series", dataType: "float_series", required: true },
  ],
  outputs: [
    { id: "signal", label: "Signal", dataType: "boolean_signal", required: false },
  ],
  params: [
    { key: "value", label: "Threshold Value", type: "number", default: 30 },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      default: "cross_above",
      options: [
        { label: "Cross Above", value: "cross_above" },
        { label: "Cross Below", value: "cross_below" },
        { label: "Above", value: "above" },
        { label: "Below", value: "below" },
      ],
    },
  ],
  color: "bg-yellow-400",
  icon: "Minus",
};

export const CROSS_NODE: NodeDef = {
  type: "cross",
  category: "signal_logic",
  label: "Cross",
  description: "Detect crossovers between two series",
  inputs: [
    { id: "fast", label: "Fast", dataType: "float_series", required: true },
    { id: "slow", label: "Slow", dataType: "float_series", required: true },
  ],
  outputs: [
    { id: "cross_above", label: "Cross Above", dataType: "boolean_signal", required: false },
    { id: "cross_below", label: "Cross Below", dataType: "boolean_signal", required: false },
  ],
  params: [],
  color: "bg-amber-500",
  icon: "Scissors",
};

export const AND_NODE: NodeDef = {
  type: "and",
  category: "signal_logic",
  label: "AND",
  description: "True only when all inputs are true",
  inputs: [
    { id: "a", label: "A", dataType: "boolean_signal", required: true },
    { id: "b", label: "B", dataType: "boolean_signal", required: true },
  ],
  outputs: [
    { id: "out", label: "Out", dataType: "boolean_signal", required: false },
  ],
  params: [],
  color: "bg-green-600",
  icon: "Combine",
};

export const OR_NODE: NodeDef = {
  type: "or",
  category: "signal_logic",
  label: "OR",
  description: "True when any input is true",
  inputs: [
    { id: "a", label: "A", dataType: "boolean_signal", required: true },
    { id: "b", label: "B", dataType: "boolean_signal", required: true },
  ],
  outputs: [
    { id: "out", label: "Out", dataType: "boolean_signal", required: false },
  ],
  params: [],
  color: "bg-green-500",
  icon: "GitMerge",
};

export const NOT_NODE: NodeDef = {
  type: "not",
  category: "signal_logic",
  label: "NOT",
  description: "Inverts a boolean signal",
  inputs: [
    { id: "in", label: "In", dataType: "boolean_signal", required: true },
  ],
  outputs: [
    { id: "out", label: "Out", dataType: "boolean_signal", required: false },
  ],
  params: [],
  color: "bg-red-500",
  icon: "Ban",
};

// ── RISK CONTROL NODES ────────────────────────────────────────────────────

export const STOP_LOSS_NODE: NodeDef = {
  type: "stop_loss",
  category: "risk_control",
  label: "Stop Loss",
  description: "Exit position when loss exceeds threshold",
  inputs: [
    { id: "entry", label: "Entry Signal", dataType: "boolean_signal", required: true },
  ],
  outputs: [
    { id: "rule", label: "Guard Rule", dataType: "guard_rule", required: false },
  ],
  params: [
    {
      key: "type",
      label: "Stop Type",
      type: "select",
      default: "percentage",
      options: [
        { label: "Percentage", value: "percentage" },
        { label: "Fixed Amount", value: "fixed" },
        { label: "ATR Multiple", value: "atr" },
      ],
    },
    { key: "value", label: "Value", type: "number", default: 2, min: 0.1, max: 100, step: 0.1 },
  ],
  color: "bg-red-600",
  icon: "ShieldOff",
};

export const TAKE_PROFIT_NODE: NodeDef = {
  type: "take_profit",
  category: "risk_control",
  label: "Take Profit",
  description: "Exit position when profit target is reached",
  inputs: [
    { id: "entry", label: "Entry Signal", dataType: "boolean_signal", required: true },
  ],
  outputs: [
    { id: "rule", label: "Guard Rule", dataType: "guard_rule", required: false },
  ],
  params: [
    {
      key: "type",
      label: "Target Type",
      type: "select",
      default: "percentage",
      options: [
        { label: "Percentage", value: "percentage" },
        { label: "Fixed Amount", value: "fixed" },
        { label: "Risk/Reward", value: "rr_ratio" },
      ],
    },
    { key: "value", label: "Value", type: "number", default: 6, min: 0.1, max: 1000, step: 0.1 },
  ],
  color: "bg-emerald-600",
  icon: "Target",
};

// ── EXECUTION NODES ───────────────────────────────────────────────────────

export const MARKET_ORDER_NODE: NodeDef = {
  type: "market_order",
  category: "execution",
  label: "Market Order",
  description: "Execute a market order when signal fires",
  inputs: [
    { id: "entry", label: "Entry", dataType: "boolean_signal", required: true },
    { id: "exit", label: "Exit", dataType: "boolean_signal", required: false },
    { id: "risk", label: "Risk Rule", dataType: "guard_rule", required: false },
  ],
  outputs: [
    { id: "order", label: "Order", dataType: "order_event", required: false },
  ],
  params: [
    {
      key: "side",
      label: "Side",
      type: "select",
      default: "long",
      options: [
        { label: "Long", value: "long" },
        { label: "Short", value: "short" },
      ],
    },
    {
      key: "size_type",
      label: "Position Size",
      type: "select",
      default: "percent_equity",
      options: [
        { label: "% of Equity", value: "percent_equity" },
        { label: "Fixed Units", value: "fixed_units" },
        { label: "Fixed Capital", value: "fixed_capital" },
      ],
    },
    { key: "size_value", label: "Size Value", type: "number", default: 10, min: 0.1, max: 100 },
  ],
  color: "bg-brand-500",
  icon: "Zap",
};

// ── OUTPUT NODES ──────────────────────────────────────────────────────────

export const PNL_CHART_NODE: NodeDef = {
  type: "pnl_chart",
  category: "output",
  label: "P&L Chart",
  description: "Visualise equity curve and performance metrics",
  inputs: [
    { id: "orders", label: "Orders", dataType: "order_event", required: true },
  ],
  outputs: [],
  params: [
    {
      key: "benchmark",
      label: "Benchmark",
      type: "select",
      default: "none",
      options: [
        { label: "None", value: "none" },
        { label: "Buy & Hold", value: "buy_hold" },
        { label: "SPY", value: "spy" },
      ],
    },
  ],
  color: "bg-violet-500",
  icon: "LineChart",
};

export const METRICS_NODE: NodeDef = {
  type: "metrics_dashboard",
  category: "output",
  label: "Metrics",
  description: "Display Sharpe, Drawdown, Win Rate, and more",
  inputs: [
    { id: "orders", label: "Orders", dataType: "order_event", required: true },
  ],
  outputs: [],
  params: [],
  color: "bg-violet-400",
  icon: "LayoutDashboard",
};

// ── Registry map ─────────────────────────────────────────────────────────

export const NODE_REGISTRY: Record<string, NodeDef> = {
  ohlcv_feed: OHLCV_FEED,
  sma: SMA_NODE,
  ema: EMA_NODE,
  rsi: RSI_NODE,
  macd: MACD_NODE,
  bollinger: BOLLINGER_NODE,
  vwap: VWAP_NODE,
  atr: ATR_NODE,
  comparator: COMPARATOR_NODE,
  threshold: THRESHOLD_NODE,
  cross: CROSS_NODE,
  and: AND_NODE,
  or: OR_NODE,
  not: NOT_NODE,
  stop_loss: STOP_LOSS_NODE,
  take_profit: TAKE_PROFIT_NODE,
  market_order: MARKET_ORDER_NODE,
  pnl_chart: PNL_CHART_NODE,
  metrics_dashboard: METRICS_NODE,
};

/** Grouped for the node palette sidebar */
export const NODE_PALETTE: { category: NodeCategory; label: string; nodes: NodeDef[] }[] = [
  {
    category: "data_source",
    label: "Data Sources",
    nodes: [OHLCV_FEED],
  },
  {
    category: "indicator",
    label: "Indicators",
    nodes: [SMA_NODE, EMA_NODE, RSI_NODE, MACD_NODE, BOLLINGER_NODE, VWAP_NODE, ATR_NODE],
  },
  {
    category: "signal_logic",
    label: "Signal Logic",
    nodes: [COMPARATOR_NODE, THRESHOLD_NODE, CROSS_NODE, AND_NODE, OR_NODE, NOT_NODE],
  },
  {
    category: "risk_control",
    label: "Risk Controls",
    nodes: [STOP_LOSS_NODE, TAKE_PROFIT_NODE],
  },
  {
    category: "execution",
    label: "Execution",
    nodes: [MARKET_ORDER_NODE],
  },
  {
    category: "output",
    label: "Output",
    nodes: [PNL_CHART_NODE, METRICS_NODE],
  },
];

/** Port color tokens by data type — used in canvas rendering */
export const PORT_COLORS: Record<PortDataType, string> = {
  time_series: "#22d3ee",      // cyan
  float_series: "#60a5fa",     // blue
  boolean_signal: "#34d399",   // emerald
  model_signal: "#a78bfa",     // violet
  allocation_map: "#f59e0b",   // amber
  guard_rule: "#f87171",       // red
  order_event: "#5c7cfa",      // brand
  visualization: "#8b5cf6",    // purple
};
