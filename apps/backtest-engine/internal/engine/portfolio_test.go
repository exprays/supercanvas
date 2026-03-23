package engine

import (
	"math"
	"testing"
)

func TestPortfolio_InitialState(t *testing.T) {
	ps := NewPortfolioState(100000, &FixedSlippage{Amount: 0}, FeeConfig{}, nil)

	if ps.Cash != 100000 {
		t.Errorf("expected cash 100000, got %f", ps.Cash)
	}
	if len(ps.Positions) != 0 {
		t.Error("expected no positions")
	}
	if len(ps.Trades) != 0 {
		t.Error("expected no trades")
	}

	prices := map[string]float64{"AAPL": 150}
	eq := ps.TotalEquity(prices)
	if eq != 100000 {
		t.Errorf("expected equity 100000 with no positions, got %f", eq)
	}
}

func TestPortfolio_BuyAndSell(t *testing.T) {
	ps := NewPortfolioState(100000, &FixedSlippage{Amount: 0}, FeeConfig{}, nil)
	bar := &Bar{Close: 100, Timestamp: "2024-01-01"}

	// Buy 10 shares at $100
	err := ps.ExecuteOrder(&OrderEvent{
		Side: "long", SizeType: "fixed_units", SizeValue: 10,
		Symbol: "AAPL", IsEntry: true,
	}, bar, bar.Timestamp)
	if err != nil {
		t.Fatal(err)
	}

	if len(ps.Trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(ps.Trades))
	}
	if ps.Trades[0].Side != "buy" {
		t.Error("expected buy trade")
	}
	if ps.Positions["AAPL"] == nil || ps.Positions["AAPL"].Quantity != 10 {
		t.Error("expected 10 AAPL shares")
	}

	expectedCash := 100000 - 10*100.0
	if math.Abs(ps.Cash-expectedCash) > 0.01 {
		t.Errorf("expected cash %f, got %f", expectedCash, ps.Cash)
	}

	// Sell at $120 → profit = (120-100) * 10 = $200
	bar2 := &Bar{Close: 120, Timestamp: "2024-02-01"}
	err = ps.ExecuteOrder(&OrderEvent{
		Side: "long", SizeType: "fixed_units", SizeValue: 10,
		Symbol: "AAPL", IsExit: true,
	}, bar2, bar2.Timestamp)
	if err != nil {
		t.Fatal(err)
	}

	if len(ps.Trades) != 2 {
		t.Fatalf("expected 2 trades, got %d", len(ps.Trades))
	}
	if ps.Trades[1].PnL <= 0 {
		t.Errorf("expected positive PnL, got %f", ps.Trades[1].PnL)
	}

	t.Logf("Buy/Sell test — PnL: $%.2f", ps.Trades[1].PnL)
}

func TestPortfolio_SlippageApplied(t *testing.T) {
	slippage := &PercentageSlippage{Percentage: 1.0}
	ps := NewPortfolioState(100000, slippage, FeeConfig{}, nil)
	bar := &Bar{Close: 100, Timestamp: "2024-01-01"}

	ps.ExecuteOrder(&OrderEvent{
		Side: "long", SizeType: "fixed_units", SizeValue: 10,
		Symbol: "AAPL", IsEntry: true,
	}, bar, bar.Timestamp)

	if ps.Positions["AAPL"] == nil {
		t.Fatal("expected position")
	}
	// 1% slippage on $100 = $101 entry
	if math.Abs(ps.Positions["AAPL"].AvgEntryPrice-101.0) > 0.01 {
		t.Errorf("expected entry ~$101 (with slippage), got $%.2f", ps.Positions["AAPL"].AvgEntryPrice)
	}
	t.Logf("Slippage — entry: $%.2f", ps.Positions["AAPL"].AvgEntryPrice)
}

func TestPortfolio_FeesDeducted(t *testing.T) {
	fees := FeeConfig{MakerFee: 0, TakerFee: 0.01}
	ps := NewPortfolioState(100000, &FixedSlippage{Amount: 0}, fees, nil)
	bar := &Bar{Close: 100, Timestamp: "2024-01-01"}

	ps.ExecuteOrder(&OrderEvent{
		Side: "long", SizeType: "fixed_units", SizeValue: 10,
		Symbol: "AAPL", IsEntry: true,
	}, bar, bar.Timestamp)

	// Cost = 10 * $100 = $1000, fees = 10 * 100 * 0.01 = $10
	expectedCash := 100000 - 1000 - 10.0
	if math.Abs(ps.Cash-expectedCash) > 0.01 {
		t.Errorf("expected cash $%.2f (after fees), got $%.2f", expectedCash, ps.Cash)
	}
	t.Logf("Fees — cash: $%.2f", ps.Cash)
}
