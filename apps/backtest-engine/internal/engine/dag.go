// ─────────────────────────────────────────────
// SuperCanvas — DAG Deserialiser
// Parses strategy JSON into Go struct graph, topological sort
// ─────────────────────────────────────────────

package engine

import (
	"encoding/json"
	"fmt"
	"sort"
)

// ── DAG types ───────────────────────────────────────────────────────────────

type PortDef struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	DataType string `json:"dataType"`
	Required bool   `json:"required"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type DAGNodeJSON struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Category string                 `json:"category"`
	Label    string                 `json:"label"`
	Params   map[string]interface{} `json:"params"`
	Inputs   []PortDef              `json:"inputs"`
	Outputs  []PortDef              `json:"outputs"`
	Position Position               `json:"position"`
}

type DAGEdgeJSON struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	SourceHandle string `json:"sourceHandle"`
	Target       string `json:"target"`
	TargetHandle string `json:"targetHandle"`
}

type DAGJSON struct {
	Nodes []DAGNodeJSON `json:"nodes"`
	Edges []DAGEdgeJSON `json:"edges"`
}

// DAG is the parsed, ready-to-execute strategy graph.
type DAG struct {
	Nodes          []Node
	Edges          []DAGEdgeJSON
	ExecutionOrder []string
	NodeMap        map[string]Node
}

// ── Parse & Build ───────────────────────────────────────────────────────────

// ParseDAG deserialises a JSON string into a DAG with topologically sorted execution order.
func ParseDAG(dagJSON string) (*DAG, error) {
	var raw DAGJSON
	if err := json.Unmarshal([]byte(dagJSON), &raw); err != nil {
		return nil, fmt.Errorf("unmarshal DAG JSON: %w", err)
	}

	return BuildDAG(raw)
}

// BuildDAG takes parsed JSON structs and returns a fully wired DAG.
func BuildDAG(raw DAGJSON) (*DAG, error) {
	nodeMap := make(map[string]Node, len(raw.Nodes))

	// Instantiate nodes
	for _, n := range raw.Nodes {
		node, err := createNode(n)
		if err != nil {
			return nil, fmt.Errorf("create node %q (%s): %w", n.ID, n.Type, err)
		}
		nodeMap[n.ID] = node
	}

	// Topological sort (Kahn's algorithm)
	order, err := topoSort(raw.Nodes, raw.Edges)
	if err != nil {
		return nil, err
	}

	nodes := make([]Node, 0, len(order))
	for _, id := range order {
		nodes = append(nodes, nodeMap[id])
	}

	return &DAG{
		Nodes:          nodes,
		Edges:          raw.Edges,
		ExecutionOrder: order,
		NodeMap:        nodeMap,
	}, nil
}

// topoSort returns node IDs in topological order using Kahn's algorithm.
func topoSort(nodes []DAGNodeJSON, edges []DAGEdgeJSON) ([]string, error) {
	inDegree := make(map[string]int, len(nodes))
	adj := make(map[string][]string, len(nodes))

	for _, n := range nodes {
		inDegree[n.ID] = 0
		adj[n.ID] = nil
	}

	for _, e := range edges {
		adj[e.Source] = append(adj[e.Source], e.Target)
		inDegree[e.Target]++
	}

	// Seed queue with zero-indegree nodes (sorted for determinism)
	queue := make([]string, 0)
	for _, n := range nodes {
		if inDegree[n.ID] == 0 {
			queue = append(queue, n.ID)
		}
	}
	sort.Strings(queue)

	order := make([]string, 0, len(nodes))
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		order = append(order, id)

		neighbors := adj[id]
		sort.Strings(neighbors)
		for _, next := range neighbors {
			inDegree[next]--
			if inDegree[next] == 0 {
				queue = append(queue, next)
			}
		}
		// Re-sort to guarantee deterministic order
		sort.Strings(queue)
	}

	if len(order) != len(nodes) {
		return nil, fmt.Errorf("circular dependency detected: processed %d of %d nodes", len(order), len(nodes))
	}

	return order, nil
}

// createNode instantiates a Node from its JSON definition.
func createNode(n DAGNodeJSON) (Node, error) {
	switch n.Type {
	// Data sources
	case "ohlcv_feed":
		return NewOHLCVFeedNode(n), nil

	// Indicators
	case "sma":
		return NewSMANode(n), nil
	case "ema":
		return NewEMANode(n), nil
	case "rsi":
		return NewRSINode(n), nil
	case "macd":
		return NewMACDNode(n), nil
	case "bollinger":
		return NewBollingerNode(n), nil
	case "vwap":
		return NewVWAPNode(n), nil
	case "atr":
		return NewATRNode(n), nil

	// Signal logic
	case "comparator":
		return NewComparatorNode(n), nil
	case "threshold":
		return NewThresholdNode(n), nil
	case "cross":
		return NewCrossNode(n), nil
	case "and":
		return NewANDNode(n), nil
	case "or":
		return NewORNode(n), nil
	case "not":
		return NewNOTNode(n), nil

	// Risk controls
	case "stop_loss":
		return NewStopLossNode(n), nil
	case "take_profit":
		return NewTakeProfitNode(n), nil

	// Execution
	case "market_order":
		return NewMarketOrderNode(n), nil

	// Output (no-ops in engine)
	case "pnl_chart", "metrics_dashboard":
		return NewNoOpNode(n), nil

	default:
		return nil, fmt.Errorf("unknown node type: %s", n.Type)
	}
}
