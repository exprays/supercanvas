package engine

import "testing"

func TestParseDAG_SMAcrossover(t *testing.T) {
	dagJSON := `{
		"nodes": [
			{"id":"feed1","type":"ohlcv_feed","category":"data","label":"OHLCV","params":{"symbol":"AAPL","timeframe":"1D"},"inputs":[],"outputs":[{"id":"ohlcv","label":"OHLCV","dataType":"bar"}],"position":{"x":0,"y":0}},
			{"id":"sma_fast","type":"sma","category":"indicator","label":"SMA 10","params":{"period":10},"inputs":[{"id":"series","label":"Series","dataType":"number","required":true}],"outputs":[{"id":"value","label":"Value","dataType":"number"}],"position":{"x":200,"y":0}},
			{"id":"sma_slow","type":"sma","category":"indicator","label":"SMA 20","params":{"period":20},"inputs":[{"id":"series","label":"Series","dataType":"number","required":true}],"outputs":[{"id":"value","label":"Value","dataType":"number"}],"position":{"x":200,"y":100}},
			{"id":"cross1","type":"cross","category":"signal","label":"Cross","params":{},"inputs":[{"id":"fast","label":"Fast","dataType":"number","required":true},{"id":"slow","label":"Slow","dataType":"number","required":true}],"outputs":[{"id":"cross_above","label":"Cross Above","dataType":"boolean"},{"id":"cross_below","label":"Cross Below","dataType":"boolean"}],"position":{"x":400,"y":50}},
			{"id":"order1","type":"market_order","category":"execution","label":"Market Order","params":{"side":"long","size_type":"percent_equity","size_value":10},"inputs":[{"id":"entry","label":"Entry","dataType":"boolean"},{"id":"exit","label":"Exit","dataType":"boolean"}],"outputs":[{"id":"order","label":"Order","dataType":"order"}],"position":{"x":600,"y":50}}
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
		t.Fatalf("ParseDAG failed: %v", err)
	}

	if len(dag.Nodes) != 5 {
		t.Errorf("expected 5 nodes, got %d", len(dag.Nodes))
	}

	// Verify topological order
	indexOf := make(map[string]int)
	for i, id := range dag.ExecutionOrder {
		indexOf[id] = i
	}

	if indexOf["feed1"] >= indexOf["sma_fast"] || indexOf["feed1"] >= indexOf["sma_slow"] {
		t.Error("feed1 must execute before SMA nodes")
	}
	if indexOf["sma_fast"] >= indexOf["cross1"] || indexOf["sma_slow"] >= indexOf["cross1"] {
		t.Error("SMA nodes must execute before cross node")
	}
	if indexOf["cross1"] >= indexOf["order1"] {
		t.Error("cross must execute before market_order")
	}

	t.Logf("Topo order: %v", dag.ExecutionOrder)
}

func TestParseDAG_CycleDetection(t *testing.T) {
	dagJSON := `{
		"nodes": [
			{"id":"a","type":"sma","category":"indicator","label":"A","params":{},"inputs":[],"outputs":[],"position":{"x":0,"y":0}},
			{"id":"b","type":"sma","category":"indicator","label":"B","params":{},"inputs":[],"outputs":[],"position":{"x":0,"y":0}}
		],
		"edges": [
			{"id":"e1","source":"a","sourceHandle":"out","target":"b","targetHandle":"in"},
			{"id":"e2","source":"b","sourceHandle":"out","target":"a","targetHandle":"in"}
		]
	}`

	_, err := ParseDAG(dagJSON)
	if err == nil {
		t.Error("expected cycle detection error, got nil")
	} else {
		t.Logf("Cycle correctly detected: %v", err)
	}
}

func TestParseDAG_UnknownNodeType(t *testing.T) {
	dagJSON := `{
		"nodes": [{"id":"x","type":"unknown_widget","category":"test","label":"X","params":{},"inputs":[],"outputs":[],"position":{"x":0,"y":0}}],
		"edges": []
	}`

	_, err := ParseDAG(dagJSON)
	if err == nil {
		t.Error("expected unknown node type error")
	} else {
		t.Logf("Unknown type correctly rejected: %v", err)
	}
}
