// ─────────────────────────────────────────────
// SuperCanvas — Data Source Nodes
// OHLCV Feed node implementation
// ─────────────────────────────────────────────

package engine

// ── OHLCV Feed Node ─────────────────────────────────────────────────────────

type OHLCVFeedNode struct {
	BaseNode
	Symbol    string
	Timeframe string
}

func NewOHLCVFeedNode(n DAGNodeJSON) *OHLCVFeedNode {
	return &OHLCVFeedNode{
		BaseNode:  newBase(n),
		Symbol:    paramStr(n.Params, "symbol", "AAPL"),
		Timeframe: paramStr(n.Params, "timeframe", "1d"),
	}
}

func (n *OHLCVFeedNode) Evaluate(ctx *TickContext) error {
	bar, ok := ctx.CurrentBars[n.Symbol]
	if !ok {
		return nil // No data for this symbol at this tick
	}

	ctx.SetPort(n.ID, "ohlcv", &PortData{
		BarValue: bar,
	})
	return nil
}
