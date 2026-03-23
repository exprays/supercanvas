package engine

import "testing"

func TestRunBacktest_SMAcrossover(t *testing.T) {
	dagJSON := `{
		"nodes": [
			{"id":"feed1","type":"ohlcv_feed","category":"data","label":"OHLCV","params":{"symbol":"AAPL","timeframe":"1D"},"inputs":[],"outputs":[{"id":"ohlcv","label":"OHLCV","dataType":"bar"}],"position":{"x":0,"y":0}},
			{"id":"sma_fast","type":"sma","category":"indicator","label":"SMA5","params":{"period":5},"inputs":[{"id":"series","label":"Series","dataType":"number","required":true}],"outputs":[{"id":"value","label":"Value","dataType":"number"}],"position":{"x":200,"y":0}},
			{"id":"sma_slow","type":"sma","category":"indicator","label":"SMA20","params":{"period":20},"inputs":[{"id":"series","label":"Series","dataType":"number","required":true}],"outputs":[{"id":"value","label":"Value","dataType":"number"}],"position":{"x":200,"y":100}},
			{"id":"cross1","type":"cross","category":"signal","label":"Cross","params":{},"inputs":[{"id":"fast","label":"Fast","dataType":"number","required":true},{"id":"slow","label":"Slow","dataType":"number","required":true}],"outputs":[{"id":"cross_above","label":"Cross Above","dataType":"boolean"},{"id":"cross_below","label":"Cross Below","dataType":"boolean"}],"position":{"x":400,"y":50}},
			{"id":"order1","type":"market_order","category":"execution","label":"Buy/Sell","params":{"side":"long","size_type":"percent_equity","size_value":50},"inputs":[{"id":"entry","label":"Entry","dataType":"boolean","required":true},{"id":"exit","label":"Exit","dataType":"boolean","required":true}],"outputs":[{"id":"order","label":"Order","dataType":"order"}],"position":{"x":600,"y":50}}
		],
		"edges": [
			{"id":"e1","source":"feed1","sourceHandle":"ohlcv","target":"sma_fast","targetHandle":"series"},
			{"id":"e2","source":"feed1","sourceHandle":"ohlcv","target":"sma_slow","targetHandle":"series"},
			{"id":"e3","source":"sma_fast","sourceHandle":"value","target":"cross1","targetHandle":"fast"},
			{"id":"e4","source":"sma_slow","sourceHandle":"value","target":"cross1","targetHandle":"slow"},
			{"id":"e5","source":"cross1","sourceHandle":"cross_above","target":"order1","targetHandle":"entry"},
			{"id":"e6","source":"cross1","sourceHandle":"cross_below","target":"order1","targetHandle":"exit"}
		]
	}`

	dag, err := ParseDAG(dagJSON)
	if err != nil {
		t.Fatalf("ParseDAG: %v", err)
	}

	// 200 bars with trend reversal: up → down → recovery
	bars := make([]Bar, 200)
	for i := 0; i < 200; i++ {
		price := 100.0
		if i < 80 {
			price = 100 + float64(i)*0.5
		} else if i < 140 {
			price = 140 - float64(i-80)*0.8
		} else {
			price = 92 + float64(i-140)*0.6
		}
		bars[i] = Bar{
			Timestamp: "2024-01-01",
			Open:      price - 0.5,
			High:      price + 1,
			Low:       price - 1,
			Close:     price,
			Volume:    2000000,
		}
	}

	config := BacktestEngineConfig{
		BacktestID:     "test-001",
		StrategyID:     "strat-001",
		Symbols:        []string{"AAPL"},
		StartDate:      "2024-01-01",
		EndDate:        "2025-01-01",
		Resolution:     "daily",
		InitialCapital: 100000,
		Slippage:       &FixedSlippage{Amount: 0},
		Fees:           FeeConfig{MakerFee: 0, TakerFee: 0},
	}

	progressCount := 0
	result, err := RunBacktest(dag, map[string][]Bar{"AAPL": bars}, config, func(p BacktestProgress) {
		progressCount++
	})

	if err != nil {
		t.Fatalf("RunBacktest error: %v", err)
	}

	if result.BacktestID != "test-001" {
		t.Errorf("wrong backtest ID: %s", result.BacktestID)
	}
	if result.Status != "completed" {
		t.Errorf("expected completed, got %s", result.Status)
	}
	if len(result.EquityCurve) != 200 {
		t.Errorf("expected 200 equity points, got %d", len(result.EquityCurve))
	}
	if progressCount == 0 {
		t.Error("expected progress callbacks")
	}

	t.Logf("✅ Backtest completed:")
	t.Logf("   Total Return: %.2f%%", result.Metrics.TotalReturn*100)
	t.Logf("   Sharpe Ratio: %.2f", result.Metrics.SharpeRatio)
	t.Logf("   Max Drawdown: %.2f%%", result.Metrics.MaxDrawdown*100)
	t.Logf("   Total Trades: %d", result.Metrics.TotalTrades)
	t.Logf("   Win Rate: %.0f%%", result.Metrics.WinRate*100)
	t.Logf("   Profit Factor: %.2f", result.Metrics.ProfitFactor)
	t.Logf("   Progress callbacks: %d", progressCount)
}

func TestRunBacktest_EmptyData(t *testing.T) {
	dagJSON := `{"nodes":[], "edges":[]}`
	dag, _ := ParseDAG(dagJSON)

	config := BacktestEngineConfig{
		BacktestID:     "test-empty",
		Symbols:        []string{"AAPL"},
		InitialCapital: 100000,
		Slippage:       &FixedSlippage{Amount: 0},
		Fees:           FeeConfig{},
	}

	_, err := RunBacktest(dag, map[string][]Bar{}, config, nil)
	if err == nil {
		t.Error("expected error for empty data")
	} else {
		t.Logf("Empty data correctly rejected: %v", err)
	}
}
