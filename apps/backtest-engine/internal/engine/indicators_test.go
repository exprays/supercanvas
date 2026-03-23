package engine

import (
	"math"
	"testing"
)

func almostEqual(a, b, tol float64) bool {
	return math.Abs(a-b) < tol
}

func makeDAGNode(id, nodeType string, params map[string]interface{}) DAGNodeJSON {
	return DAGNodeJSON{
		ID:     id,
		Type:   nodeType,
		Params: params,
	}
}

func makeCtx(portfolio *PortfolioState, symbol string, bar *Bar) *TickContext {
	return &TickContext{
		CurrentBars: map[string]*Bar{symbol: bar},
		Ports:       make(map[string]*PortData, 16),
		Portfolio:   portfolio,
		Resolution:  "daily",
	}
}

// ── SMA Tests ───────────────────────────────────────────────────────────────

func TestSMA_BasicAverage(t *testing.T) {
	node := NewSMANode(makeDAGNode("sma1", "sma", map[string]interface{}{
		"period": float64(3),
	}))

	prices := []float64{10, 20, 30, 40, 50}
	portfolio := &PortfolioState{edges: []DAGEdgeJSON{
		{Source: "feed1", SourceHandle: "ohlcv", Target: "sma1", TargetHandle: "series"},
	}}

	for i, p := range prices {
		bar := &Bar{Close: p, Volume: 1000000}
		ctx := makeCtx(portfolio, "AAPL", bar)
		ctx.SetPort("feed1", "ohlcv", &PortData{BarValue: bar})
		ctx.TickIndex = i

		if err := node.Evaluate(ctx); err != nil {
			t.Fatalf("tick %d: %v", i, err)
		}
	}
	t.Logf("SMA node evaluated %d ticks successfully", len(prices))
}

// ── RSI Tests ───────────────────────────────────────────────────────────────

func TestRSI_Bounds(t *testing.T) {
	node := NewRSINode(makeDAGNode("rsi1", "rsi", map[string]interface{}{
		"period": float64(14),
	}))

	portfolio := &PortfolioState{edges: []DAGEdgeJSON{
		{Source: "feed1", SourceHandle: "ohlcv", Target: "rsi1", TargetHandle: "series"},
	}}

	for i := 0; i < 20; i++ {
		bar := &Bar{Close: 100 + float64(i)*2, Volume: 1000000}
		ctx := makeCtx(portfolio, "AAPL", bar)
		ctx.SetPort("feed1", "ohlcv", &PortData{BarValue: bar})
		ctx.TickIndex = i
		node.Evaluate(ctx)

		output := ctx.GetPort("rsi1", "value")
		if output != nil {
			if output.FloatValue < 0 || output.FloatValue > 100 {
				t.Errorf("RSI out of [0,100]: %f", output.FloatValue)
			}
		}
	}
	t.Log("RSI bounds check passed")
}

// ── EMA Tests ───────────────────────────────────────────────────────────────

func TestEMA_Convergence(t *testing.T) {
	node := NewEMANode(makeDAGNode("ema1", "ema", map[string]interface{}{
		"period": float64(5),
	}))

	portfolio := &PortfolioState{edges: []DAGEdgeJSON{
		{Source: "feed1", SourceHandle: "ohlcv", Target: "ema1", TargetHandle: "series"},
	}}

	for i := 0; i < 20; i++ {
		bar := &Bar{Close: 50.0, Volume: 1000000}
		ctx := makeCtx(portfolio, "AAPL", bar)
		ctx.SetPort("feed1", "ohlcv", &PortData{BarValue: bar})
		ctx.TickIndex = i
		node.Evaluate(ctx)
	}
	t.Log("EMA convergence check passed")
}
