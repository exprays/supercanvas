// ─────────────────────────────────────────────
// SuperCanvas — Indicator Nodes
// SMA, EMA, RSI, MACD, Bollinger, VWAP, ATR
// All use O(1) rolling computation where possible
// ─────────────────────────────────────────────

package engine

import "math"

// ── Helpers ─────────────────────────────────────────────────────────────────

// getSourcePrice extracts the price from a Bar based on "source" param.
func getSourcePrice(bar *Bar, source string) float64 {
	switch source {
	case "open":
		return bar.Open
	case "high":
		return bar.High
	case "low":
		return bar.Low
	case "hl2":
		return (bar.High + bar.Low) / 2.0
	default:
		return bar.Close
	}
}

// resolveInputBar finds the upstream bar for indicator nodes.
func resolveInputBar(ctx *TickContext, edges []DAGEdgeJSON, nodeID, portID string) *Bar {
	for _, e := range edges {
		if e.Target == nodeID && e.TargetHandle == portID {
			pd := ctx.GetPort(e.Source, e.SourceHandle)
			if pd != nil && pd.BarValue != nil {
				return pd.BarValue
			}
		}
	}
	return nil
}

// resolveInputFloat finds the upstream float for signal nodes.
func resolveInputFloat(ctx *TickContext, edges []DAGEdgeJSON, nodeID, portID string) (float64, bool) {
	for _, e := range edges {
		if e.Target == nodeID && e.TargetHandle == portID {
			pd := ctx.GetPort(e.Source, e.SourceHandle)
			if pd != nil && pd.IsSet {
				return pd.FloatValue, true
			}
		}
	}
	return 0, false
}

// resolveInputBool finds the upstream boolean for logic nodes.
func resolveInputBool(ctx *TickContext, edges []DAGEdgeJSON, nodeID, portID string) (bool, bool) {
	for _, e := range edges {
		if e.Target == nodeID && e.TargetHandle == portID {
			pd := ctx.GetPort(e.Source, e.SourceHandle)
			if pd != nil && pd.IsSet {
				return pd.BoolValue, true
			}
		}
	}
	return false, false
}

// resolveInputGuard finds upstream guard rule.
func resolveInputGuard(ctx *TickContext, edges []DAGEdgeJSON, nodeID, portID string) *GuardRule {
	for _, e := range edges {
		if e.Target == nodeID && e.TargetHandle == portID {
			pd := ctx.GetPort(e.Source, e.SourceHandle)
			if pd != nil && pd.GuardRule != nil {
				return pd.GuardRule
			}
		}
	}
	return nil
}

// ── SMA Node ────────────────────────────────────────────────────────────────

type SMANode struct {
	BaseNode
	Period int
	Source string
	buffer []float64
	sum    float64
}

func NewSMANode(n DAGNodeJSON) *SMANode {
	return &SMANode{
		BaseNode: newBase(n),
		Period:   paramInt(n.Params, "period", 20),
		Source:   paramStr(n.Params, "source", "close"),
		buffer:   make([]float64, 0),
	}
}

func (n *SMANode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "series")
	if bar == nil {
		return nil
	}

	price := getSourcePrice(bar, n.Source)
	n.buffer = append(n.buffer, price)
	n.sum += price

	if len(n.buffer) > n.Period {
		n.sum -= n.buffer[0]
		n.buffer = n.buffer[1:]
	}

	if len(n.buffer) >= n.Period {
		sma := n.sum / float64(n.Period)
		ctx.SetPort(n.ID, "sma", &PortData{FloatValue: sma})
	}

	return nil
}

// ── EMA Node ────────────────────────────────────────────────────────────────

type EMANode struct {
	BaseNode
	Period int
	Source string
	k      float64
	ema    float64
	count  int
	sum    float64
}

func NewEMANode(n DAGNodeJSON) *EMANode {
	period := paramInt(n.Params, "period", 20)
	return &EMANode{
		BaseNode: newBase(n),
		Period:   period,
		Source:   paramStr(n.Params, "source", "close"),
		k:        2.0 / float64(period+1),
	}
}

func (n *EMANode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "series")
	if bar == nil {
		return nil
	}

	price := getSourcePrice(bar, n.Source)
	n.count++

	if n.count <= n.Period {
		n.sum += price
		if n.count == n.Period {
			n.ema = n.sum / float64(n.Period)
			ctx.SetPort(n.ID, "ema", &PortData{FloatValue: n.ema})
		}
	} else {
		n.ema = price*n.k + n.ema*(1-n.k)
		ctx.SetPort(n.ID, "ema", &PortData{FloatValue: n.ema})
	}

	return nil
}

// ── RSI Node (Wilder's smoothing) ───────────────────────────────────────────

type RSINode struct {
	BaseNode
	Period  int
	Source  string
	prevPrice float64
	avgGain   float64
	avgLoss   float64
	count     int
	gains     []float64
	losses    []float64
}

func NewRSINode(n DAGNodeJSON) *RSINode {
	return &RSINode{
		BaseNode: newBase(n),
		Period:   paramInt(n.Params, "period", 14),
		Source:   paramStr(n.Params, "source", "close"),
		gains:    make([]float64, 0),
		losses:   make([]float64, 0),
	}
}

func (n *RSINode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "series")
	if bar == nil {
		return nil
	}

	price := getSourcePrice(bar, n.Source)
	n.count++

	if n.count == 1 {
		n.prevPrice = price
		return nil
	}

	change := price - n.prevPrice
	n.prevPrice = price

	gain := 0.0
	loss := 0.0
	if change > 0 {
		gain = change
	} else {
		loss = -change
	}

	if n.count <= n.Period+1 {
		n.gains = append(n.gains, gain)
		n.losses = append(n.losses, loss)

		if n.count == n.Period+1 {
			sumGain := 0.0
			sumLoss := 0.0
			for _, g := range n.gains {
				sumGain += g
			}
			for _, l := range n.losses {
				sumLoss += l
			}
			n.avgGain = sumGain / float64(n.Period)
			n.avgLoss = sumLoss / float64(n.Period)

			var rsi float64
			if n.avgLoss == 0 {
				rsi = 100
			} else {
				rs := n.avgGain / n.avgLoss
				rsi = 100 - 100/(1+rs)
			}
			ctx.SetPort(n.ID, "rsi", &PortData{FloatValue: rsi})
		}
	} else {
		// Wilder's smoothing
		n.avgGain = (n.avgGain*float64(n.Period-1) + gain) / float64(n.Period)
		n.avgLoss = (n.avgLoss*float64(n.Period-1) + loss) / float64(n.Period)

		var rsi float64
		if n.avgLoss == 0 {
			rsi = 100
		} else {
			rs := n.avgGain / n.avgLoss
			rsi = 100 - 100/(1+rs)
		}
		ctx.SetPort(n.ID, "rsi", &PortData{FloatValue: rsi})
	}

	return nil
}

// ── MACD Node ───────────────────────────────────────────────────────────────

type MACDNode struct {
	BaseNode
	FastPeriod   int
	SlowPeriod   int
	SignalPeriod int
	fastEMA      float64
	slowEMA      float64
	signalEMA    float64
	fastK        float64
	slowK        float64
	signalK      float64
	fastSum      float64
	slowSum      float64
	signalSum    float64
	fastCount    int
	slowCount    int
	signalCount  int
	macdValues   []float64
}

func NewMACDNode(n DAGNodeJSON) *MACDNode {
	fast := paramInt(n.Params, "fast_period", 12)
	slow := paramInt(n.Params, "slow_period", 26)
	signal := paramInt(n.Params, "signal_period", 9)
	return &MACDNode{
		BaseNode:     newBase(n),
		FastPeriod:   fast,
		SlowPeriod:   slow,
		SignalPeriod: signal,
		fastK:        2.0 / float64(fast+1),
		slowK:        2.0 / float64(slow+1),
		signalK:      2.0 / float64(signal+1),
		macdValues:   make([]float64, 0),
	}
}

func (n *MACDNode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "series")
	if bar == nil {
		return nil
	}

	price := bar.Close
	n.fastCount++
	n.slowCount++

	// Fast EMA
	if n.fastCount <= n.FastPeriod {
		n.fastSum += price
		if n.fastCount == n.FastPeriod {
			n.fastEMA = n.fastSum / float64(n.FastPeriod)
		}
	} else {
		n.fastEMA = price*n.fastK + n.fastEMA*(1-n.fastK)
	}

	// Slow EMA
	if n.slowCount <= n.SlowPeriod {
		n.slowSum += price
		if n.slowCount == n.SlowPeriod {
			n.slowEMA = n.slowSum / float64(n.SlowPeriod)
		}
	} else {
		n.slowEMA = price*n.slowK + n.slowEMA*(1-n.slowK)
	}

	// Only emit after slow is initialised
	if n.slowCount < n.SlowPeriod {
		return nil
	}

	macd := n.fastEMA - n.slowEMA
	n.signalCount++

	if n.signalCount <= n.SignalPeriod {
		n.signalSum += macd
		n.macdValues = append(n.macdValues, macd)
		if n.signalCount == n.SignalPeriod {
			n.signalEMA = n.signalSum / float64(n.SignalPeriod)
			histogram := macd - n.signalEMA
			ctx.SetPort(n.ID, "macd", &PortData{FloatValue: macd})
			ctx.SetPort(n.ID, "signal", &PortData{FloatValue: n.signalEMA})
			ctx.SetPort(n.ID, "histogram", &PortData{FloatValue: histogram})
		}
	} else {
		n.signalEMA = macd*n.signalK + n.signalEMA*(1-n.signalK)
		histogram := macd - n.signalEMA
		ctx.SetPort(n.ID, "macd", &PortData{FloatValue: macd})
		ctx.SetPort(n.ID, "signal", &PortData{FloatValue: n.signalEMA})
		ctx.SetPort(n.ID, "histogram", &PortData{FloatValue: histogram})
	}

	return nil
}

// ── Bollinger Bands Node ────────────────────────────────────────────────────

type BollingerNode struct {
	BaseNode
	Period int
	StdDev float64
	buffer []float64
	sum    float64
	sumSq  float64
}

func NewBollingerNode(n DAGNodeJSON) *BollingerNode {
	return &BollingerNode{
		BaseNode: newBase(n),
		Period:   paramInt(n.Params, "period", 20),
		StdDev:   paramFloat(n.Params, "std_dev", 2.0),
		buffer:   make([]float64, 0),
	}
}

func (n *BollingerNode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "series")
	if bar == nil {
		return nil
	}

	price := bar.Close
	n.buffer = append(n.buffer, price)
	n.sum += price
	n.sumSq += price * price

	if len(n.buffer) > n.Period {
		old := n.buffer[0]
		n.sum -= old
		n.sumSq -= old * old
		n.buffer = n.buffer[1:]
	}

	if len(n.buffer) >= n.Period {
		mean := n.sum / float64(n.Period)
		variance := n.sumSq/float64(n.Period) - mean*mean
		if variance < 0 {
			variance = 0
		}
		sd := math.Sqrt(variance)

		ctx.SetPort(n.ID, "upper", &PortData{FloatValue: mean + n.StdDev*sd})
		ctx.SetPort(n.ID, "middle", &PortData{FloatValue: mean})
		ctx.SetPort(n.ID, "lower", &PortData{FloatValue: mean - n.StdDev*sd})
	}

	return nil
}

// ── VWAP Node ───────────────────────────────────────────────────────────────

type VWAPNode struct {
	BaseNode
	Anchor     string
	cumPV      float64
	cumVolume  float64
	lastAnchor string
}

func NewVWAPNode(n DAGNodeJSON) *VWAPNode {
	return &VWAPNode{
		BaseNode: newBase(n),
		Anchor:   paramStr(n.Params, "anchor", "session"),
	}
}

func (n *VWAPNode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "ohlcv")
	if bar == nil {
		return nil
	}

	typicalPrice := (bar.High + bar.Low + bar.Close) / 3.0
	n.cumPV += typicalPrice * bar.Volume
	n.cumVolume += bar.Volume

	if n.cumVolume > 0 {
		vwap := n.cumPV / n.cumVolume
		ctx.SetPort(n.ID, "vwap", &PortData{FloatValue: vwap})
	}

	return nil
}

// ── ATR Node (Average True Range with Wilder's smoothing) ───────────────────

type ATRNode struct {
	BaseNode
	Period  int
	prevBar *Bar
	atr     float64
	count   int
	trSum   float64
}

func NewATRNode(n DAGNodeJSON) *ATRNode {
	return &ATRNode{
		BaseNode: newBase(n),
		Period:   paramInt(n.Params, "period", 14),
	}
}

func (n *ATRNode) Evaluate(ctx *TickContext) error {
	bar := resolveInputBar(ctx, ctx.Portfolio.edges, n.ID, "ohlcv")
	if bar == nil {
		return nil
	}

	n.count++

	var tr float64
	if n.prevBar == nil {
		tr = bar.High - bar.Low
	} else {
		tr = mathMax(
			bar.High-bar.Low,
			mathMax(
				mathAbs(bar.High-n.prevBar.Close),
				mathAbs(bar.Low-n.prevBar.Close),
			),
		)
	}

	n.prevBar = bar

	if n.count <= n.Period {
		n.trSum += tr
		if n.count == n.Period {
			n.atr = n.trSum / float64(n.Period)
			ctx.SetPort(n.ID, "atr", &PortData{FloatValue: n.atr})
		}
	} else {
		// Wilder's smoothing
		n.atr = (n.atr*float64(n.Period-1) + tr) / float64(n.Period)
		ctx.SetPort(n.ID, "atr", &PortData{FloatValue: n.atr})
	}

	return nil
}
