// ─────────────────────────────────────────────
// SuperCanvas — Node Interface & Tick Context
// Core abstractions for DAG evaluation
// ─────────────────────────────────────────────

package engine

import (
	"encoding/json"
	"math"
)

// ── OHLCV Bar ───────────────────────────────────────────────────────────────

// Bar represents a single OHLCV candle.
type Bar struct {
	Timestamp string
	Open      float64
	High      float64
	Low       float64
	Close     float64
	Volume    float64
}

// ── Port Data ───────────────────────────────────────────────────────────────

// PortData holds the value flowing through a port between nodes.
type PortData struct {
	FloatValue  float64
	BoolValue   bool
	SeriesValue []float64
	BarValue    *Bar
	GuardRule   *GuardRule
	OrderEvent  *OrderEvent
	IsSet       bool
}

// GuardRule defines a risk control rule (stop loss / take profit).
type GuardRule struct {
	Type  string // "stop_loss" | "take_profit"
	Mode  string // "percentage" | "fixed" | "atr" | "rr_ratio"
	Value float64
}

// OrderEvent represents a generated order from an execution node.
type OrderEvent struct {
	Side      string // "long" | "short"
	SizeType  string // "percent_equity" | "fixed_units" | "fixed_capital"
	SizeValue float64
	Symbol    string
	IsEntry   bool
	IsExit    bool
}

// ── Tick Context ────────────────────────────────────────────────────────────

// TickContext holds all state available during a single tick evaluation.
type TickContext struct {
	// Current tick index (0-based)
	TickIndex int

	// Current bars by symbol
	CurrentBars map[string]*Bar

	// All historical bars by symbol (up to current tick)
	AllBars map[string][]Bar

	// Port data bus: "nodeID:portID" → PortData
	Ports map[string]*PortData

	// Portfolio state reference
	Portfolio *PortfolioState

	// Current resolution
	Resolution string
}

// SetPort writes a value to the port data bus.
func (tc *TickContext) SetPort(nodeID, portID string, data *PortData) {
	key := nodeID + ":" + portID
	data.IsSet = true
	tc.Ports[key] = data
}

// GetPort reads a value from the port data bus.
func (tc *TickContext) GetPort(nodeID, portID string) *PortData {
	key := nodeID + ":" + portID
	if d, ok := tc.Ports[key]; ok && d.IsSet {
		return d
	}
	return nil
}

// ── Node Interface ──────────────────────────────────────────────────────────

// Node is the interface every DAG node implements.
type Node interface {
	NodeID() string
	NodeType() string
	Evaluate(ctx *TickContext) error
}

// ── Base Node ───────────────────────────────────────────────────────────────

// BaseNode holds common fields shared by all nodes.
type BaseNode struct {
	ID       string
	Type     string
	Category string
	Label    string
	Params   map[string]interface{}
	Inputs   []PortDef
	Outputs  []PortDef
}

func (b *BaseNode) NodeID() string   { return b.ID }
func (b *BaseNode) NodeType() string { return b.Type }

func newBase(n DAGNodeJSON) BaseNode {
	return BaseNode{
		ID:       n.ID,
		Type:     n.Type,
		Category: n.Category,
		Label:    n.Label,
		Params:   n.Params,
		Inputs:   n.Inputs,
		Outputs:  n.Outputs,
	}
}

// ── Helper: param extraction ────────────────────────────────────────────────

func paramFloat(params map[string]interface{}, key string, fallback float64) float64 {
	if v, ok := params[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		case json.Number:
			f, _ := val.Float64()
			return f
		}
	}
	return fallback
}

func paramInt(params map[string]interface{}, key string, fallback int) int {
	return int(paramFloat(params, key, float64(fallback)))
}

func paramStr(params map[string]interface{}, key, fallback string) string {
	if v, ok := params[key]; ok {
		if s, ok2 := v.(string); ok2 {
			return s
		}
	}
	return fallback
}

// ── NoOp Node (for output nodes that have no engine logic) ──────────────────

type NoOpNode struct{ BaseNode }

func NewNoOpNode(n DAGNodeJSON) *NoOpNode {
	return &NoOpNode{BaseNode: newBase(n)}
}

func (n *NoOpNode) Evaluate(_ *TickContext) error { return nil }

// ── Math helpers ────────────────────────────────────────────────────────────

func mathMax(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func mathMin(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func mathAbs(a float64) float64 {
	return math.Abs(a)
}

func mathSqrt(a float64) float64 {
	return math.Sqrt(a)
}
