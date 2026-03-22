// ─────────────────────────────────────────────
// SuperCanvas — Backtest Types
// ─────────────────────────────────────────────

/** Backtest time resolution */
export type BacktestResolution = "daily" | "minute" | "tick";

/** Backtest status lifecycle */
export type BacktestStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/** Slippage model configuration */
export interface SlippageModel {
  type: "fixed" | "percentage" | "market_impact";
  value: number;
}

/** Fee schedule for backtest */
export interface FeeSchedule {
  makerFee: number;
  takerFee: number;
  currency: string;
}

/** Backtest configuration submitted by user */
export interface BacktestConfig {
  strategyId: string;
  strategyVersion: number;
  symbols: string[];
  startDate: string;
  endDate: string;
  resolution: BacktestResolution;
  initialCapital: number;
  currency: string;
  slippage: SlippageModel;
  fees: FeeSchedule;
}

/** A single trade in the backtest log */
export interface BacktestTrade {
  timestamp: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
  slippage: number;
  pnl: number;
}

/** Performance metrics computed by the engine */
export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeDuration: number;
  volatility: number;
}

/** Equity curve data point */
export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  cash: number;
}

/** Complete backtest result */
export interface BacktestResult {
  id: string;
  configHash: string;
  status: BacktestStatus;
  metrics: BacktestMetrics;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  startedAt: string;
  completedAt?: string;
  resultUrl?: string;
  creditsUsed: number;
}
