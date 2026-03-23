package engine

import (
	"math"
	"testing"
)

func TestMetrics_SteadyGrowth(t *testing.T) {
	mc := NewMetricsCollector(100000, "daily")

	equity := 100000.0
	for i := 0; i < 252; i++ {
		equity *= 1.001
		mc.OnTick(equity)
	}

	result := mc.Compute(equity)

	if result.TotalReturn <= 0 {
		t.Errorf("expected positive total return, got %f", result.TotalReturn)
	}
	if result.SharpeRatio <= 0 {
		t.Errorf("expected positive Sharpe for steady growth, got %f", result.SharpeRatio)
	}
	if result.MaxDrawdown != 0 {
		t.Errorf("expected 0 drawdown for steady growth, got %f", result.MaxDrawdown)
	}

	t.Logf("Steady growth — Return: %.2f%%, Sharpe: %.2f, MaxDD: %.4f%%",
		result.TotalReturn*100, result.SharpeRatio, result.MaxDrawdown*100)
}

func TestMetrics_DrawdownTracking(t *testing.T) {
	mc := NewMetricsCollector(100000, "daily")

	mc.OnTick(110000) // +10%
	mc.OnTick(120000) // +20% (HWM)
	mc.OnTick(100000) // back to start
	mc.OnTick(90000)  // -25% from HWM

	result := mc.Compute(90000)

	expectedDD := (120000 - 90000) / 120000.0
	if math.Abs(result.MaxDrawdown-expectedDD) > 0.001 {
		t.Errorf("expected max drawdown ~%.4f, got %.4f", expectedDD, result.MaxDrawdown)
	}

	t.Logf("Drawdown — MaxDD: %.2f%%", result.MaxDrawdown*100)
}

func TestMetrics_TradeStats(t *testing.T) {
	mc := NewMetricsCollector(100000, "daily")

	mc.OnTrade(500, 5)
	mc.OnTrade(-200, 3)
	mc.OnTrade(300, 4)
	mc.OnTrade(-100, 2)
	mc.OnTrade(400, 6)

	mc.OnTick(100000)
	result := mc.Compute(100000)

	if result.TotalTrades != 5 {
		t.Errorf("expected 5 trades, got %d", result.TotalTrades)
	}
	if result.WinRate != 0.6 {
		t.Errorf("expected 60%% win rate, got %.2f%%", result.WinRate*100)
	}
	// Profit factor = (500+300+400) / (200+100) = 4.0
	if math.Abs(result.ProfitFactor-4.0) > 0.01 {
		t.Errorf("expected profit factor 4.0, got %f", result.ProfitFactor)
	}

	t.Logf("Trade stats — WinRate: %.0f%%, ProfitFactor: %.2f",
		result.WinRate*100, result.ProfitFactor)
}
