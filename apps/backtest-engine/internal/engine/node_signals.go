// ─────────────────────────────────────────────
// SuperCanvas — Signal Logic Nodes
// Comparator, Threshold, Cross, AND, OR, NOT
// ─────────────────────────────────────────────

package engine

// ── Comparator Node ─────────────────────────────────────────────────────────

type ComparatorNode struct {
	BaseNode
	Operator string
}

func NewComparatorNode(n DAGNodeJSON) *ComparatorNode {
	return &ComparatorNode{
		BaseNode: newBase(n),
		Operator: paramStr(n.Params, "operator", "gt"),
	}
}

func (n *ComparatorNode) Evaluate(ctx *TickContext) error {
	a, okA := resolveInputFloat(ctx, ctx.Portfolio.edges, n.ID, "a")
	b, okB := resolveInputFloat(ctx, ctx.Portfolio.edges, n.ID, "b")
	if !okA || !okB {
		return nil
	}

	var result bool
	switch n.Operator {
	case "gt":
		result = a > b
	case "lt":
		result = a < b
	case "gte":
		result = a >= b
	case "lte":
		result = a <= b
	case "eq":
		result = a == b
	}

	ctx.SetPort(n.ID, "signal", &PortData{BoolValue: result})
	return nil
}

// ── Threshold Node ──────────────────────────────────────────────────────────

type ThresholdNode struct {
	BaseNode
	Value     float64
	Direction string
	prevValue float64
	hasPrev   bool
}

func NewThresholdNode(n DAGNodeJSON) *ThresholdNode {
	return &ThresholdNode{
		BaseNode:  newBase(n),
		Value:     paramFloat(n.Params, "value", 30),
		Direction: paramStr(n.Params, "direction", "cross_above"),
	}
}

func (n *ThresholdNode) Evaluate(ctx *TickContext) error {
	val, ok := resolveInputFloat(ctx, ctx.Portfolio.edges, n.ID, "series")
	if !ok {
		return nil
	}

	var result bool
	switch n.Direction {
	case "cross_above":
		if n.hasPrev {
			result = n.prevValue <= n.Value && val > n.Value
		}
	case "cross_below":
		if n.hasPrev {
			result = n.prevValue >= n.Value && val < n.Value
		}
	case "above":
		result = val > n.Value
	case "below":
		result = val < n.Value
	}

	n.prevValue = val
	n.hasPrev = true

	ctx.SetPort(n.ID, "signal", &PortData{BoolValue: result})
	return nil
}

// ── Cross Node ──────────────────────────────────────────────────────────────

type CrossNode struct {
	BaseNode
	prevFast float64
	prevSlow float64
	hasPrev  bool
}

func NewCrossNode(n DAGNodeJSON) *CrossNode {
	return &CrossNode{BaseNode: newBase(n)}
}

func (n *CrossNode) Evaluate(ctx *TickContext) error {
	fast, okF := resolveInputFloat(ctx, ctx.Portfolio.edges, n.ID, "fast")
	slow, okS := resolveInputFloat(ctx, ctx.Portfolio.edges, n.ID, "slow")
	if !okF || !okS {
		return nil
	}

	crossAbove := false
	crossBelow := false

	if n.hasPrev {
		crossAbove = n.prevFast <= n.prevSlow && fast > slow
		crossBelow = n.prevFast >= n.prevSlow && fast < slow
	}

	n.prevFast = fast
	n.prevSlow = slow
	n.hasPrev = true

	ctx.SetPort(n.ID, "cross_above", &PortData{BoolValue: crossAbove})
	ctx.SetPort(n.ID, "cross_below", &PortData{BoolValue: crossBelow})
	return nil
}

// ── AND Node ────────────────────────────────────────────────────────────────

type ANDNode struct{ BaseNode }

func NewANDNode(n DAGNodeJSON) *ANDNode {
	return &ANDNode{BaseNode: newBase(n)}
}

func (n *ANDNode) Evaluate(ctx *TickContext) error {
	a, okA := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "a")
	b, okB := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "b")
	if !okA || !okB {
		return nil
	}

	ctx.SetPort(n.ID, "out", &PortData{BoolValue: a && b})
	return nil
}

// ── OR Node ─────────────────────────────────────────────────────────────────

type ORNode struct{ BaseNode }

func NewORNode(n DAGNodeJSON) *ORNode {
	return &ORNode{BaseNode: newBase(n)}
}

func (n *ORNode) Evaluate(ctx *TickContext) error {
	a, okA := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "a")
	b, okB := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "b")
	if !okA || !okB {
		return nil
	}

	ctx.SetPort(n.ID, "out", &PortData{BoolValue: a || b})
	return nil
}

// ── NOT Node ────────────────────────────────────────────────────────────────

type NOTNode struct{ BaseNode }

func NewNOTNode(n DAGNodeJSON) *NOTNode {
	return &NOTNode{BaseNode: newBase(n)}
}

func (n *NOTNode) Evaluate(ctx *TickContext) error {
	val, ok := resolveInputBool(ctx, ctx.Portfolio.edges, n.ID, "in")
	if !ok {
		return nil
	}

	ctx.SetPort(n.ID, "out", &PortData{BoolValue: !val})
	return nil
}
