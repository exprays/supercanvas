// ─────────────────────────────────────────────
// SuperCanvas — Portfolio State
// Track cash, positions, orders, full audit trail
// ─────────────────────────────────────────────

package engine

import (
	"fmt"
	"math"
)

// ── Position ────────────────────────────────────────────────────────────────

type PositionRecord struct {
	Symbol        string
	Quantity      float64
	AvgEntryPrice float64
	RealizedPnL   float64
	UnrealizedPnL float64
	EntryTime     string
}

// ── Trade (audit trail) ─────────────────────────────────────────────────────

type TradeRecord struct {
	Timestamp string
	Symbol    string
	Side      string
	Quantity  float64
	Price     float64
	Fees      float64
	Slippage  float64
	PnL       float64
}

// ── Equity Point ────────────────────────────────────────────────────────────

type EquityPointRecord struct {
	Timestamp string
	Equity    float64
	Drawdown  float64
	Cash      float64
}

// ── Portfolio State ─────────────────────────────────────────────────────────

type PortfolioState struct {
	InitialCapital float64
	Cash           float64
	Positions      map[string]*PositionRecord
	Trades         []TradeRecord
	EquityCurve    []EquityPointRecord
	SlippageModel  SlippageCalculator
	FeeSchedule    FeeConfig
	HighWaterMark  float64

	// edges is stored here for convenience so nodes can resolve inputs
	edges []DAGEdgeJSON
}

type FeeConfig struct {
	MakerFee float64
	TakerFee float64
}

func NewPortfolioState(initialCapital float64, slippage SlippageCalculator, fees FeeConfig, edges []DAGEdgeJSON) *PortfolioState {
	return &PortfolioState{
		InitialCapital: initialCapital,
		Cash:           initialCapital,
		Positions:      make(map[string]*PositionRecord),
		Trades:         make([]TradeRecord, 0, 512),
		EquityCurve:    make([]EquityPointRecord, 0, 1024),
		SlippageModel:  slippage,
		FeeSchedule:    fees,
		HighWaterMark:  initialCapital,
		edges:          edges,
	}
}

// GetPosition returns a position for a symbol, or nil if none.
func (ps *PortfolioState) GetPosition(symbol string) *PositionRecord {
	return ps.Positions[symbol]
}

// TotalEquity returns cash + unrealized P&L of all positions.
func (ps *PortfolioState) TotalEquity(currentPrices map[string]float64) float64 {
	equity := ps.Cash
	for sym, pos := range ps.Positions {
		if pos.Quantity == 0 {
			continue
		}
		price, ok := currentPrices[sym]
		if !ok {
			continue
		}
		equity += pos.Quantity * price
	}
	return equity
}

// UpdateMarks marks all positions to market.
func (ps *PortfolioState) UpdateMarks(currentPrices map[string]float64) {
	for sym, pos := range ps.Positions {
		if pos.Quantity == 0 {
			continue
		}
		price, ok := currentPrices[sym]
		if !ok {
			continue
		}
		pos.UnrealizedPnL = (price - pos.AvgEntryPrice) * pos.Quantity
	}
}

// RecordEquityPoint records an equity snapshot.
func (ps *PortfolioState) RecordEquityPoint(timestamp string, currentPrices map[string]float64) {
	equity := ps.TotalEquity(currentPrices)
	if equity > ps.HighWaterMark {
		ps.HighWaterMark = equity
	}

	drawdown := 0.0
	if ps.HighWaterMark > 0 {
		drawdown = (ps.HighWaterMark - equity) / ps.HighWaterMark
	}

	ps.EquityCurve = append(ps.EquityCurve, EquityPointRecord{
		Timestamp: timestamp,
		Equity:    equity,
		Drawdown:  drawdown,
		Cash:      ps.Cash,
	})
}

// ExecuteOrder processes an order event against the portfolio.
func (ps *PortfolioState) ExecuteOrder(event *OrderEvent, bar *Bar, timestamp string) error {
	if event == nil || bar == nil {
		return nil
	}

	price := bar.Close

	// Apply slippage
	slippageAmt := ps.SlippageModel.Calculate(price, event.SizeValue)
	if event.IsEntry {
		if event.Side == "long" {
			price += slippageAmt
		} else {
			price -= slippageAmt
		}
	} else {
		// Exit: slippage works against you
		if event.Side == "long" {
			price -= slippageAmt
		} else {
			price += slippageAmt
		}
	}

	// Calculate quantity
	quantity := ps.calculateQuantity(event, price)
	if quantity <= 0 {
		return nil
	}

	// Calculate fees (taker for market orders)
	fees := quantity * price * ps.FeeSchedule.TakerFee

	pos := ps.Positions[event.Symbol]

	if event.IsEntry {
		// Enter new position
		cost := quantity*price + fees
		if cost > ps.Cash {
			// Reduce to affordable
			quantity = (ps.Cash - fees) / price
			if quantity <= 0 {
				return nil
			}
			cost = quantity*price + fees
		}

		ps.Cash -= cost

		if pos == nil {
			ps.Positions[event.Symbol] = &PositionRecord{
				Symbol:        event.Symbol,
				Quantity:      quantity,
				AvgEntryPrice: price,
				EntryTime:     timestamp,
			}
		} else {
			// Average into existing position
			totalCost := pos.AvgEntryPrice*pos.Quantity + price*quantity
			pos.Quantity += quantity
			pos.AvgEntryPrice = totalCost / pos.Quantity
		}

		ps.Trades = append(ps.Trades, TradeRecord{
			Timestamp: timestamp,
			Symbol:    event.Symbol,
			Side:      "buy",
			Quantity:  quantity,
			Price:     price,
			Fees:      fees,
			Slippage:  slippageAmt * quantity,
			PnL:       0, // P&L on entry is 0
		})

	} else if event.IsExit {
		if pos == nil || pos.Quantity == 0 {
			return nil
		}

		exitQty := math.Min(pos.Quantity, quantity)
		proceeds := exitQty*price - fees
		pnl := (price - pos.AvgEntryPrice) * exitQty

		ps.Cash += proceeds
		pos.Quantity -= exitQty
		pos.RealizedPnL += pnl

		if pos.Quantity <= 0.0001 {
			pos.Quantity = 0
			pos.UnrealizedPnL = 0
		}

		ps.Trades = append(ps.Trades, TradeRecord{
			Timestamp: timestamp,
			Symbol:    event.Symbol,
			Side:      "sell",
			Quantity:  exitQty,
			Price:     price,
			Fees:      fees,
			Slippage:  slippageAmt * exitQty,
			PnL:       pnl,
		})
	}

	return nil
}

func (ps *PortfolioState) calculateQuantity(event *OrderEvent, price float64) float64 {
	currentPrices := make(map[string]float64)
	for sym, pos := range ps.Positions {
		if pos.Quantity > 0 {
			currentPrices[sym] = pos.AvgEntryPrice // approximate
		}
	}
	equity := ps.TotalEquity(currentPrices)

	switch event.SizeType {
	case "percent_equity":
		capital := equity * event.SizeValue / 100.0
		return capital / price
	case "fixed_units":
		return event.SizeValue
	case "fixed_capital":
		return event.SizeValue / price
	default:
		return 0
	}
}

// Summary returns a formatted portfolio summary string.
func (ps *PortfolioState) Summary(currentPrices map[string]float64) string {
	equity := ps.TotalEquity(currentPrices)
	ret := (equity - ps.InitialCapital) / ps.InitialCapital * 100
	return fmt.Sprintf("Equity: $%.2f | Cash: $%.2f | Return: %.2f%% | Trades: %d",
		equity, ps.Cash, ret, len(ps.Trades))
}
