// ─────────────────────────────────────────────
// SuperCanvas — gRPC Service Implementation
// Handles RunBacktest, GetResults, GetHealth
// ─────────────────────────────────────────────

package grpcserver

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/supercanvas/backtest-engine/internal/engine"
	"github.com/supercanvas/backtest-engine/internal/observability"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// BacktestServer implements the gRPC BacktestService.
type BacktestServer struct {
	mu              sync.RWMutex
	results         map[string]*engine.BacktestResultData
	activeBacktests int32
	maxConcurrent   int32
}

func NewBacktestServer(maxConcurrent int) *BacktestServer {
	return &BacktestServer{
		results:       make(map[string]*engine.BacktestResultData),
		maxConcurrent: int32(maxConcurrent),
	}
}

// ActiveBacktests returns the count of currently running backtests.
func (s *BacktestServer) ActiveBacktests() int32 {
	return atomic.LoadInt32(&s.activeBacktests)
}

// RunBacktest handles the server-streaming RPC for backtest execution.
// It deserialises the DAG, generates synthetic data, runs the backtest,
// and streams progress events back to the client.
func (s *BacktestServer) RunBacktest(req *BacktestRequest, stream BacktestService_RunBacktestServer) error {
	if atomic.LoadInt32(&s.activeBacktests) >= s.maxConcurrent {
		return status.Errorf(codes.ResourceExhausted, "max concurrent backtests reached (%d)", s.maxConcurrent)
	}
	atomic.AddInt32(&s.activeBacktests, 1)
	defer atomic.AddInt32(&s.activeBacktests, -1)

	backtestID := req.BacktestId
	if backtestID == "" {
		return status.Error(codes.InvalidArgument, "backtest_id is required")
	}

	span, ctx := observability.StartTransaction(stream.Context(), "backtest.run", "backtest")
	span.SetTag("backtest_id", backtestID)
	defer span.Finish()

	observability.AddBreadcrumb("backtest", "Backtest started", map[string]interface{}{
		"backtest_id": backtestID,
		"strategy_id": req.StrategyId,
	})

	log.Printf("📊 RunBacktest called: %s (strategy: %s)", backtestID, req.StrategyId)

	// Parse DAG
	dag, err := engine.ParseDAG(req.DagJson)
	if err != nil {
		observability.CaptureError(err, map[string]string{
			"backtest_id": backtestID,
			"phase":       "dag_parse",
		})
		return status.Errorf(codes.InvalidArgument, "invalid DAG: %v", err)
	}

	// Build config
	config := engine.BacktestEngineConfig{
		BacktestID:     backtestID,
		StrategyID:     req.StrategyId,
		Symbols:        req.Config.Symbols,
		StartDate:      req.Config.StartDate,
		EndDate:        req.Config.EndDate,
		Resolution:     req.Config.Resolution,
		InitialCapital: req.Config.InitialCapital,
		Currency:       req.Config.Currency,
		Slippage:       engine.NewSlippageModel(req.Config.Slippage.Type, req.Config.Slippage.Value),
		Fees:           engine.FeeConfig{MakerFee: req.Config.Fees.MakerFee, TakerFee: req.Config.Fees.TakerFee},
	}

	// Generate synthetic market data (Phase 2: will be replaced by DB query)
	marketData := GenerateSyntheticData(config.Symbols, config.StartDate, config.EndDate, config.Resolution)

	// Run backtest with progress streaming
	result, err := engine.RunBacktest(dag, marketData, config, func(progress engine.BacktestProgress) {
		eventPB := convertProgressToProto(progress)

		if sendErr := stream.Send(eventPB); sendErr != nil {
			log.Printf("⚠️  Failed to stream progress: %v", sendErr)
		}
	})

	if err != nil {
		observability.CaptureError(err, map[string]string{
			"backtest_id": backtestID,
			"phase":       "execution",
		})

		// Send error progress event
		_ = stream.Send(&BacktestProgressEvent{
			BacktestId:   backtestID,
			Status:       "failed",
			Progress:     0,
			ErrorMessage: err.Error(),
		})

		return status.Errorf(codes.Internal, "backtest failed: %v", err)
	}

	// Cache result
	s.mu.Lock()
	s.results[backtestID] = result
	s.mu.Unlock()

	_ = ctx // suppress unused warning
	observability.AddBreadcrumb("backtest", "Backtest completed", map[string]interface{}{
		"backtest_id":  backtestID,
		"total_trades": result.Metrics.TotalTrades,
		"total_return": result.Metrics.TotalReturn,
	})

	return nil
}

// GetResults returns the cached result for a completed backtest.
func (s *BacktestServer) GetResults(ctx context.Context, req *ResultRequest) (*BacktestResult, error) {
	s.mu.RLock()
	result, ok := s.results[req.BacktestId]
	s.mu.RUnlock()

	if !ok {
		return nil, status.Errorf(codes.NotFound, "backtest result not found: %s", req.BacktestId)
	}

	return convertResultToProto(result), nil
}

// GetHealth returns the service health status.
func (s *BacktestServer) GetHealth(ctx context.Context, req *HealthRequest) (*HealthResponse, error) {
	return &HealthResponse{
		Status:          "ok",
		Version:         "0.1.0",
		ActiveBacktests: s.ActiveBacktests(),
	}, nil
}

// ── Proto converters ────────────────────────────────────────────────────────

func convertProgressToProto(p engine.BacktestProgress) *BacktestProgressEvent {
	event := &BacktestProgressEvent{
		BacktestId:   p.BacktestID,
		Status:       p.Status,
		Progress:     p.Progress,
		CurrentDate:  p.CurrentDate,
		ErrorMessage: p.ErrorMessage,
	}

	for _, ep := range p.PartialEquity {
		event.PartialEquityCurve = append(event.PartialEquityCurve, &EquityPoint{
			Timestamp: ep.Timestamp,
			Equity:    ep.Equity,
			Drawdown:  ep.Drawdown,
			Cash:      ep.Cash,
		})
	}

	if p.MetricsSnapshot != nil {
		event.MetricsSnapshot = convertMetricsToProto(*p.MetricsSnapshot)
	}

	return event
}

func convertResultToProto(r *engine.BacktestResultData) *BacktestResult {
	result := &BacktestResult{
		BacktestId: r.BacktestID,
		Status:     r.Status,
		Metrics:    convertMetricsToProto(r.Metrics),
	}

	for _, ep := range r.EquityCurve {
		result.EquityCurve = append(result.EquityCurve, &EquityPoint{
			Timestamp: ep.Timestamp,
			Equity:    ep.Equity,
			Drawdown:  ep.Drawdown,
			Cash:      ep.Cash,
		})
	}

	for _, t := range r.Trades {
		result.Trades = append(result.Trades, &Trade{
			Timestamp: t.Timestamp,
			Symbol:    t.Symbol,
			Side:      t.Side,
			Quantity:  t.Quantity,
			Price:     t.Price,
			Fees:      t.Fees,
			Slippage:  t.Slippage,
			Pnl:       t.PnL,
		})
	}

	return result
}

func convertMetricsToProto(m engine.MetricsResult) *BacktestMetrics {
	return &BacktestMetrics{
		TotalReturn:         m.TotalReturn,
		AnnualizedReturn:    m.AnnualizedReturn,
		SharpeRatio:         m.SharpeRatio,
		SortinoRatio:        m.SortinoRatio,
		CalmarRatio:         m.CalmarRatio,
		MaxDrawdown:         m.MaxDrawdown,
		MaxDrawdownDuration: m.MaxDrawdownDur,
		WinRate:             m.WinRate,
		ProfitFactor:        m.ProfitFactor,
		TotalTrades:         int32(m.TotalTrades),
		AvgTradeDuration:    m.AvgTradeDuration,
		Volatility:          m.Volatility,
	}
}

// ── Synthetic Data Generator (Phase 2 placeholder) ──────────────────────────

func GenerateSyntheticData(symbols []string, startDate, endDate, resolution string) map[string][]engine.Bar {
	data := make(map[string][]engine.Bar)

	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)

	for _, symbol := range symbols {
		bars := make([]engine.Bar, 0, 500)
		price := 100.0 + rand.Float64()*100 // Random starting price 100-200
		rng := rand.New(rand.NewSource(hashSymbol(symbol)))

		switch resolution {
		case "minute":
			for t := start; t.Before(end); t = t.Add(time.Minute) {
				// Skip weekends and outside market hours (9:30 - 16:00 ET)
				if t.Weekday() == time.Saturday || t.Weekday() == time.Sunday {
					continue
				}
				hour := t.Hour()
				if hour < 9 || (hour == 9 && t.Minute() < 30) || hour >= 16 {
					continue
				}

				bar := generateBar(rng, &price, t.Format(time.RFC3339), 0.001)
				bars = append(bars, bar)
			}
		default: // daily
			for t := start; t.Before(end); t = t.AddDate(0, 0, 1) {
				if t.Weekday() == time.Saturday || t.Weekday() == time.Sunday {
					continue
				}
				bar := generateBar(rng, &price, t.Format("2006-01-02"), 0.015)
				bars = append(bars, bar)
			}
		}

		data[symbol] = bars
	}

	return data
}

func generateBar(rng *rand.Rand, price *float64, timestamp string, volatility float64) engine.Bar {
	change := (rng.Float64()*2 - 1) * volatility
	open := *price
	close := open * (1 + change)
	high := open * (1 + rng.Float64()*volatility*1.5)
	low := open * (1 - rng.Float64()*volatility*1.5)

	if high < close {
		high = close * 1.001
	}
	if low > close {
		low = close * 0.999
	}
	if low > open {
		low = open * 0.999
	}

	volume := 1000000.0 + rng.Float64()*5000000.0
	*price = close

	return engine.Bar{
		Timestamp: timestamp,
		Open:      open,
		High:      high,
		Low:       low,
		Close:     close,
		Volume:    volume,
	}
}

func hashSymbol(s string) int64 {
	var h int64
	for _, c := range s {
		h = h*31 + int64(c)
	}
	if h < 0 {
		h = -h
	}
	return h
}

// ── Proto types placeholder (will be replaced by protoc-generated code) ───

// NOTE: These types mirror the .proto definitions and serve as the interface
// until protoc code generation is set up. In production, run:
//   protoc --go_out=. --go-grpc_out=. proto/backtest.proto

type BacktestRequest struct {
	BacktestId string
	StrategyId string
	DagJson    string
	Config     *BacktestConfigProto
}

type BacktestConfigProto struct {
	Symbols        []string
	StartDate      string
	EndDate        string
	Resolution     string
	InitialCapital float64
	Currency       string
	Slippage       *SlippageModelProto
	Fees           *FeeScheduleProto
}

type SlippageModelProto struct {
	Type  string
	Value float64
}

type FeeScheduleProto struct {
	MakerFee float64
	TakerFee float64
}

type BacktestProgressEvent struct {
	BacktestId         string
	Status             string
	Progress           float64
	CurrentDate        string
	PartialEquityCurve []*EquityPoint
	MetricsSnapshot    *BacktestMetrics
	ErrorMessage       string
}

type BacktestResult struct {
	BacktestId    string
	Status        string
	Metrics       *BacktestMetrics
	EquityCurve   []*EquityPoint
	Trades        []*Trade
	ResultMsgpack []byte
	CreditsUsed   int32
}

type EquityPoint struct {
	Timestamp string
	Equity    float64
	Drawdown  float64
	Cash      float64
}

type Trade struct {
	Timestamp string
	Symbol    string
	Side      string
	Quantity  float64
	Price     float64
	Fees      float64
	Slippage  float64
	Pnl       float64
}

type BacktestMetrics struct {
	TotalReturn         float64
	AnnualizedReturn    float64
	SharpeRatio         float64
	SortinoRatio        float64
	CalmarRatio         float64
	MaxDrawdown         float64
	MaxDrawdownDuration float64
	WinRate             float64
	ProfitFactor        float64
	TotalTrades         int32
	AvgTradeDuration    float64
	Volatility          float64
}

type ResultRequest struct {
	BacktestId string
}

type HealthRequest struct{}

type HealthResponse struct {
	Status          string
	Version         string
	ActiveBacktests int32
}

// Stream interface placeholder
type BacktestService_RunBacktestServer interface {
	Send(*BacktestProgressEvent) error
	Context() context.Context
}

// ── unused import suppressor ──
var _ = json.Marshal
var _ = sentry.CaptureException
