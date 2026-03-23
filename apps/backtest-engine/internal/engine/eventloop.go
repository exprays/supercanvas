// ─────────────────────────────────────────────
// SuperCanvas — Event Loop
// Main backtest execution loop: iterates through ticks in topological order
// ─────────────────────────────────────────────

package engine

import (
	"fmt"
	"log"
	"time"
)

// BacktestConfig holds the configuration for a backtest run.
type BacktestEngineConfig struct {
	BacktestID     string
	StrategyID     string
	Symbols        []string
	StartDate      string // "2024-01-01"
	EndDate        string // "2025-01-01"
	Resolution     string // "daily" | "minute"
	InitialCapital float64
	Currency       string
	Slippage       SlippageCalculator
	Fees           FeeConfig
}

// BacktestProgress is sent periodically during execution.
type BacktestProgress struct {
	BacktestID       string
	Status           string
	Progress         float64
	CurrentDate      string
	PartialEquity    []EquityPointRecord
	MetricsSnapshot  *MetricsResult
	ErrorMessage     string
}

// ProgressCallback is called with progress updates during execution.
type ProgressCallback func(progress BacktestProgress)

// RunBacktest executes a full backtest given a DAG and market data.
func RunBacktest(
	dag *DAG,
	data map[string][]Bar, // symbol → bars sorted by time
	config BacktestEngineConfig,
	onProgress ProgressCallback,
) (*BacktestResultData, error) {
	startTime := time.Now()

	// Validate we have data
	if len(data) == 0 {
		return nil, fmt.Errorf("no market data provided")
	}

	// Determine the primary symbol's timeline
	primarySymbol := config.Symbols[0]
	bars, ok := data[primarySymbol]
	if !ok {
		return nil, fmt.Errorf("no data for primary symbol %s", primarySymbol)
	}

	totalTicks := len(bars)
	if totalTicks == 0 {
		return nil, fmt.Errorf("empty data for symbol %s", primarySymbol)
	}

	log.Printf("🚀 Starting backtest %s: %d ticks for %s (%s to %s)",
		config.BacktestID, totalTicks, primarySymbol, config.StartDate, config.EndDate)

	// Initialize portfolio
	portfolio := NewPortfolioState(config.InitialCapital, config.Slippage, config.Fees, dag.Edges)

	// Initialize metrics collector
	metrics := NewMetricsCollector(config.InitialCapital, config.Resolution)

	// Progress reporting interval
	reportInterval := totalTicks / 100
	if reportInterval < 1 {
		reportInterval = 1
	}

	// ── Main event loop ─────────────────────────────────────────────────────
	for tickIdx := 0; tickIdx < totalTicks; tickIdx++ {
		bar := &bars[tickIdx]

		// Build current bars map for all symbols
		currentBars := make(map[string]*Bar, len(config.Symbols))
		currentPrices := make(map[string]float64, len(config.Symbols))
		for _, sym := range config.Symbols {
			symBars, exists := data[sym]
			if exists && tickIdx < len(symBars) {
				b := &symBars[tickIdx]
				currentBars[sym] = b
				currentPrices[sym] = b.Close
			}
		}

		// Create tick context
		ctx := &TickContext{
			TickIndex:   tickIdx,
			CurrentBars: currentBars,
			AllBars:     nil, // Not needed for daily/minute — Phase 3 will add
			Ports:       make(map[string]*PortData, len(dag.Nodes)*3),
			Portfolio:   portfolio,
			Resolution:  config.Resolution,
		}

		// Evaluate all nodes in topological order
		for _, node := range dag.Nodes {
			if err := node.Evaluate(ctx); err != nil {
				log.Printf("⚠️  Node %s error: %v", node.NodeID(), err)
				// Continue — don't fail entire backtest on a single node error
			}
		}

		// Process generated orders
		for _, node := range dag.Nodes {
			orderPort := ctx.GetPort(node.NodeID(), "order")
			if orderPort != nil && orderPort.OrderEvent != nil {
				if err := portfolio.ExecuteOrder(orderPort.OrderEvent, bar, bar.Timestamp); err != nil {
					log.Printf("⚠️  Order execution error: %v", err)
				}
			}
		}

		// Mark positions to market
		portfolio.UpdateMarks(currentPrices)

		// Record equity and metrics
		equity := portfolio.TotalEquity(currentPrices)
		portfolio.RecordEquityPoint(bar.Timestamp, currentPrices)
		metrics.OnTick(equity)

		// Record trade metrics for any trades that happened this tick
		for i := len(portfolio.Trades) - 1; i >= 0; i-- {
			trade := portfolio.Trades[i]
			if trade.Timestamp == bar.Timestamp && trade.Side == "sell" {
				metrics.OnTrade(trade.PnL, 1) // Duration tracking simplified for Phase 2
			}
		}

		// Report progress
		if tickIdx%reportInterval == 0 || tickIdx == totalTicks-1 {
			progress := float64(tickIdx+1) / float64(totalTicks) * 100

			if onProgress != nil {
				metricsSnap := metrics.Compute(equity)

				// Sample equity curve (max 200 points for streaming)
				var partialEquity []EquityPointRecord
				step := len(portfolio.EquityCurve) / 200
				if step < 1 {
					step = 1
				}
				for j := 0; j < len(portfolio.EquityCurve); j += step {
					partialEquity = append(partialEquity, portfolio.EquityCurve[j])
				}

				onProgress(BacktestProgress{
					BacktestID:      config.BacktestID,
					Status:          "running",
					Progress:        progress,
					CurrentDate:     bar.Timestamp,
					PartialEquity:   partialEquity,
					MetricsSnapshot: &metricsSnap,
				})
			}
		}
	}

	// ── Compute final metrics ───────────────────────────────────────────────
	finalPrices := make(map[string]float64)
	for _, sym := range config.Symbols {
		symBars := data[sym]
		if len(symBars) > 0 {
			finalPrices[sym] = symBars[len(symBars)-1].Close
		}
	}

	finalEquity := portfolio.TotalEquity(finalPrices)
	finalMetrics := metrics.Compute(finalEquity)

	elapsed := time.Since(startTime)
	log.Printf("✅ Backtest %s completed in %s — %s", config.BacktestID, elapsed, portfolio.Summary(finalPrices))

	result := &BacktestResultData{
		BacktestID:  config.BacktestID,
		Status:      "completed",
		Metrics:     finalMetrics,
		EquityCurve: portfolio.EquityCurve,
		Trades:      portfolio.Trades,
	}

	// Send final progress
	if onProgress != nil {
		onProgress(BacktestProgress{
			BacktestID:      config.BacktestID,
			Status:          "completed",
			Progress:        100,
			CurrentDate:     bars[totalTicks-1].Timestamp,
			PartialEquity:   portfolio.EquityCurve,
			MetricsSnapshot: &finalMetrics,
		})
	}

	return result, nil
}

// BacktestResultData holds the complete backtest output.
type BacktestResultData struct {
	BacktestID  string
	Status      string
	Metrics     MetricsResult
	EquityCurve []EquityPointRecord
	Trades      []TradeRecord
}
