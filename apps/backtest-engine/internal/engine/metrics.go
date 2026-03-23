// ─────────────────────────────────────────────
// SuperCanvas — Metrics Collector
// O(1) per-tick streaming metrics using Welford's algorithm
// Sharpe, Sortino, Calmar, Max Drawdown, Win Rate, etc.
// ─────────────────────────────────────────────

package engine

import "math"

// MetricsResult holds all computed performance metrics.
type MetricsResult struct {
	TotalReturn       float64
	AnnualizedReturn  float64
	SharpeRatio       float64
	SortinoRatio      float64
	CalmarRatio       float64
	MaxDrawdown       float64
	MaxDrawdownDur    float64 // in number of bars
	WinRate           float64
	ProfitFactor      float64
	TotalTrades       int
	AvgTradeDuration  float64
	Volatility        float64
}

// MetricsCollector computes metrics incrementally.
type MetricsCollector struct {
	initialEquity float64

	// For return tracking
	prevEquity float64
	returns    []float64

	// Welford's online mean/variance for returns
	n         int
	meanRet   float64
	m2Ret     float64

	// Downside deviation (Sortino)
	downsideSum float64
	downsideN   int

	// High-water mark / drawdown
	hwm          float64
	maxDD        float64
	ddStart      int
	maxDDDur     int
	curDDDur     int

	// Trade metrics
	winCount     int
	lossCount    int
	grossProfit  float64
	grossLoss    float64
	tradeDurSum  float64

	// Annualisation
	barsPerYear float64
}

func NewMetricsCollector(initialEquity float64, resolution string) *MetricsCollector {
	barsPerYear := 252.0 // daily
	if resolution == "minute" {
		barsPerYear = 252 * 390 // 390 minutes per trading day
	}

	return &MetricsCollector{
		initialEquity: initialEquity,
		prevEquity:    initialEquity,
		hwm:           initialEquity,
		barsPerYear:   barsPerYear,
		returns:       make([]float64, 0, 1024),
	}
}

// OnTick should be called after every bar with the current equity.
func (mc *MetricsCollector) OnTick(equity float64) {
	if mc.prevEquity == 0 {
		mc.prevEquity = equity
		return
	}

	ret := (equity - mc.prevEquity) / mc.prevEquity
	mc.prevEquity = equity
	mc.returns = append(mc.returns, ret)

	// Welford's online algorithm for mean and variance
	mc.n++
	delta := ret - mc.meanRet
	mc.meanRet += delta / float64(mc.n)
	delta2 := ret - mc.meanRet
	mc.m2Ret += delta * delta2

	// Downside deviation (for Sortino)
	if ret < 0 {
		mc.downsideSum += ret * ret
		mc.downsideN++
	}

	// Drawdown tracking
	if equity > mc.hwm {
		mc.hwm = equity
		mc.curDDDur = 0
	} else {
		mc.curDDDur++
	}

	dd := 0.0
	if mc.hwm > 0 {
		dd = (mc.hwm - equity) / mc.hwm
	}
	if dd > mc.maxDD {
		mc.maxDD = dd
	}
	if mc.curDDDur > mc.maxDDDur {
		mc.maxDDDur = mc.curDDDur
	}
}

// OnTrade should be called for each completed trade.
func (mc *MetricsCollector) OnTrade(pnl float64, durationBars float64) {
	if pnl > 0 {
		mc.winCount++
		mc.grossProfit += pnl
	} else if pnl < 0 {
		mc.lossCount++
		mc.grossLoss += math.Abs(pnl)
	}
	mc.tradeDurSum += durationBars
}

// Compute returns the final metrics.
func (mc *MetricsCollector) Compute(finalEquity float64) MetricsResult {
	totalReturn := 0.0
	if mc.initialEquity > 0 {
		totalReturn = (finalEquity - mc.initialEquity) / mc.initialEquity
	}

	totalTrades := mc.winCount + mc.lossCount

	// Annualised return
	annReturn := 0.0
	if mc.n > 0 {
		annReturn = math.Pow(1+totalReturn, mc.barsPerYear/float64(mc.n)) - 1
	}

	// Volatility (annualised std dev of returns)
	volatility := 0.0
	if mc.n > 1 {
		variance := mc.m2Ret / float64(mc.n-1)
		volatility = math.Sqrt(variance) * math.Sqrt(mc.barsPerYear)
	}

	// Sharpe Ratio (assuming risk-free = 0)
	sharpe := 0.0
	if volatility > 0 {
		sharpe = annReturn / volatility
	}

	// Sortino Ratio
	sortino := 0.0
	if mc.downsideN > 0 {
		downsideDev := math.Sqrt(mc.downsideSum/float64(mc.downsideN)) * math.Sqrt(mc.barsPerYear)
		if downsideDev > 0 {
			sortino = annReturn / downsideDev
		}
	}

	// Calmar Ratio
	calmar := 0.0
	if mc.maxDD > 0 {
		calmar = annReturn / mc.maxDD
	}

	// Win rate
	winRate := 0.0
	if totalTrades > 0 {
		winRate = float64(mc.winCount) / float64(totalTrades)
	}

	// Profit Factor
	profitFactor := 0.0
	if mc.grossLoss > 0 {
		profitFactor = mc.grossProfit / mc.grossLoss
	} else if mc.grossProfit > 0 {
		profitFactor = math.Inf(1)
	}

	// Avg trade duration
	avgDur := 0.0
	if totalTrades > 0 {
		avgDur = mc.tradeDurSum / float64(totalTrades)
	}

	return MetricsResult{
		TotalReturn:      totalReturn,
		AnnualizedReturn: annReturn,
		SharpeRatio:      sharpe,
		SortinoRatio:     sortino,
		CalmarRatio:      calmar,
		MaxDrawdown:      mc.maxDD,
		MaxDrawdownDur:   float64(mc.maxDDDur),
		WinRate:          winRate,
		ProfitFactor:     profitFactor,
		TotalTrades:      totalTrades,
		AvgTradeDuration: avgDur,
		Volatility:       volatility,
	}
}
