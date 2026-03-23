// ─────────────────────────────────────────────
// SuperCanvas — Risk Control & Execution Nodes
// Stop Loss, Take Profit, Market Order
// ─────────────────────────────────────────────

package engine

// ── Stop Loss Node ──────────────────────────────────────────────────────────

type StopLossNode struct {
	BaseNode
	StopType string
	Value    float64
}

func NewStopLossNode(n DAGNodeJSON) *StopLossNode {
	return &StopLossNode{
		BaseNode: newBase(n),
		StopType: paramStr(n.Params, "type", "percentage"),
		Value:    paramFloat(n.Params, "value", 2.0),
	}
}

func (n *StopLossNode) Evaluate(ctx *TickContext) error {
	// Just pass through the guard rule for the execution node to use
	ctx.SetPort(n.ID, "rule", &PortData{
		GuardRule: &GuardRule{
			Type:  "stop_loss",
			Mode:  n.StopType,
			Value: n.Value,
		},
	})
	return nil
}

// ── Take Profit Node ────────────────────────────────────────────────────────

type TakeProfitNode struct {
	BaseNode
	TargetType string
	Value      float64
}

func NewTakeProfitNode(n DAGNodeJSON) *TakeProfitNode {
	return &TakeProfitNode{
		BaseNode:   newBase(n),
		TargetType: paramStr(n.Params, "type", "percentage"),
		Value:      paramFloat(n.Params, "value", 6.0),
	}
}

func (n *TakeProfitNode) Evaluate(ctx *TickContext) error {
	ctx.SetPort(n.ID, "rule", &PortData{
		GuardRule: &GuardRule{
			Type:  "take_profit",
			Mode:  n.TargetType,
			Value: n.Value,
		},
	})
	return nil
}

// ── Market Order Node ───────────────────────────────────────────────────────

type MarketOrderNode struct {
	BaseNode
	Side      string
	SizeType  string
	SizeValue float64
}

func NewMarketOrderNode(n DAGNodeJSON) *MarketOrderNode {
	return &MarketOrderNode{
		BaseNode:  newBase(n),
		Side:      paramStr(n.Params, "side", "long"),
		SizeType:  paramStr(n.Params, "size_type", "percent_equity"),
		SizeValue: paramFloat(n.Params, "size_value", 10),
	}
}

func (n *MarketOrderNode) Evaluate(ctx *TickContext) error {
	entry, hasEntry := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "entry")
	exit, hasExit := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "exit")
	riskRule := resolveInputGuard(ctx, ctx.Portfolio.edges, n.ID, "risk")

	// Determine the symbol from the first OHLCV Feed node in the graph
	symbol := ""
	for sym := range ctx.CurrentBars {
		symbol = sym
		break
	}
	if symbol == "" {
		return nil
	}

	bar := ctx.CurrentBars[symbol]
	if bar == nil {
		return nil
	}

	// Check risk controls against existing positions
	if riskRule != nil {
		pos := ctx.Portfolio.GetPosition(symbol)
		if pos != nil && pos.Quantity != 0 {
			shouldExit := false

			switch riskRule.Type {
			case "stop_loss":
				switch riskRule.Mode {
				case "percentage":
					pnlPct := (bar.Close - pos.AvgEntryPrice) / pos.AvgEntryPrice * 100
					if n.Side == "long" && pnlPct <= -riskRule.Value {
						shouldExit = true
					} else if n.Side == "short" && pnlPct >= riskRule.Value {
						shouldExit = true
					}
				case "fixed":
					pnl := (bar.Close - pos.AvgEntryPrice) * pos.Quantity
					if n.Side == "long" && pnl <= -riskRule.Value {
						shouldExit = true
					} else if n.Side == "short" && pnl >= riskRule.Value {
						shouldExit = true
					}
				}
			case "take_profit":
				switch riskRule.Mode {
				case "percentage":
					pnlPct := (bar.Close - pos.AvgEntryPrice) / pos.AvgEntryPrice * 100
					if n.Side == "long" && pnlPct >= riskRule.Value {
						shouldExit = true
					} else if n.Side == "short" && pnlPct <= -riskRule.Value {
						shouldExit = true
					}
				case "fixed":
					pnl := (bar.Close - pos.AvgEntryPrice) * pos.Quantity
					if n.Side == "long" && pnl >= riskRule.Value {
						shouldExit = true
					} else if n.Side == "short" && pnl <= -riskRule.Value {
						shouldExit = true
					}
				}
			}

			if shouldExit {
				ctx.SetPort(n.ID, "order", &PortData{
					OrderEvent: &OrderEvent{
						Side:      n.Side,
						SizeType:  n.SizeType,
						SizeValue: n.SizeValue,
						Symbol:    symbol,
						IsEntry:   false,
						IsExit:    true,
					},
				})
				return nil
			}
		}
	}

	// Handle exit signal
	if hasExit && exit {
		pos := ctx.Portfolio.GetPosition(symbol)
		if pos != nil && pos.Quantity != 0 {
			ctx.SetPort(n.ID, "order", &PortData{
				OrderEvent: &OrderEvent{
					Side:      n.Side,
					SizeType:  n.SizeType,
					SizeValue: n.SizeValue,
					Symbol:    symbol,
					IsEntry:   false,
					IsExit:    true,
				},
			})
			return nil
		}
	}

	// Handle entry signal
	if hasEntry && entry {
		pos := ctx.Portfolio.GetPosition(symbol)
		// Only enter if no existing position
		if pos == nil || pos.Quantity == 0 {
			ctx.SetPort(n.ID, "order", &PortData{
				OrderEvent: &OrderEvent{
					Side:      n.Side,
					SizeType:  n.SizeType,
					SizeValue: n.SizeValue,
					Symbol:    symbol,
					IsEntry:   true,
					IsExit:    false,
				},
			})
		}
	}

	return nil
}
