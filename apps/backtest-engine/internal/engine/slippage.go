// ─────────────────────────────────────────────
// SuperCanvas — Slippage Models
// Fixed, Percentage, Market Impact
// ─────────────────────────────────────────────

package engine

import "math"

// SlippageCalculator computes slippage for a given price and size.
type SlippageCalculator interface {
	Calculate(price float64, size float64) float64
}

// ── Fixed Slippage ──────────────────────────────────────────────────────────

type FixedSlippage struct {
	Amount float64 // Fixed dollar amount per share
}

func (s *FixedSlippage) Calculate(price, size float64) float64 {
	return s.Amount
}

// ── Percentage Slippage ─────────────────────────────────────────────────────

type PercentageSlippage struct {
	Percentage float64 // e.g., 0.1 = 0.1%
}

func (s *PercentageSlippage) Calculate(price, size float64) float64 {
	return price * s.Percentage / 100.0
}

// ── Market Impact Slippage ──────────────────────────────────────────────────

type MarketImpactSlippage struct {
	Factor float64 // Impact factor
}

func (s *MarketImpactSlippage) Calculate(price, size float64) float64 {
	// Square root market impact model: slippage ∝ √(order_size)
	if size <= 0 {
		return 0
	}
	return price * s.Factor * math.Sqrt(size) / 10000.0
}

// ── Factory ─────────────────────────────────────────────────────────────────

func NewSlippageModel(typ string, value float64) SlippageCalculator {
	switch typ {
	case "fixed":
		return &FixedSlippage{Amount: value}
	case "percentage":
		return &PercentageSlippage{Percentage: value}
	case "market_impact":
		return &MarketImpactSlippage{Factor: value}
	default:
		return &FixedSlippage{Amount: 0}
	}
}
