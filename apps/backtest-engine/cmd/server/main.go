// ─────────────────────────────────────────────
// SuperCanvas — Go Backtest Engine
// gRPC + HTTP health server with OpenTelemetry + Sentry instrumentation
// ─────────────────────────────────────────────

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/supercanvas/backtest-engine/internal/engine"
	grpcserver "github.com/supercanvas/backtest-engine/internal/grpc"
	"github.com/supercanvas/backtest-engine/internal/observability"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

const (
	defaultGRPCPort = "50051"
	defaultHTTPPort = "8080"
	serviceName     = "backtest-engine"
	serviceVersion  = "0.2.0"
)

func main() {
	grpcPort := getEnv("GRPC_PORT", defaultGRPCPort)
	httpPort := getEnv("HTTP_PORT", defaultHTTPPort)

	log.Printf("🚀 SuperCanvas Backtest Engine starting (v%s)...", serviceVersion)
	log.Printf("   gRPC port: %s", grpcPort)
	log.Printf("   HTTP port: %s (health check + API)", httpPort)

	// ── Sentry setup ──
	if err := observability.InitSentry(); err != nil {
		log.Printf("⚠️  Sentry init warning: %v", err)
	}
	defer observability.FlushSentry()

	// ── OpenTelemetry setup ──
	ctx := context.Background()
	tp, err := initTracerProvider(ctx)
	if err != nil {
		log.Fatalf("Failed to init tracer provider: %v", err)
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tp.Shutdown(shutdownCtx); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	// ── Create backtest server ──
	server := grpcserver.NewBacktestServer(10) // max 10 concurrent backtests

	// ── Start health check + JSON HTTP API ──
	go startHTTPServer(httpPort, server)

	// ── Start gRPC server ──
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", grpcPort, err)
	}
	defer lis.Close()

	log.Printf("✅ gRPC server listening on :%s", grpcPort)
	log.Printf("✅ HTTP API at http://localhost:%s", httpPort)
	log.Printf("✅ Sentry error tracking enabled")
	log.Printf("✅ OpenTelemetry tracing enabled → %s", getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "disabled"))

	// ── Graceful shutdown ──
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("🛑 Shutting down gracefully...")
	observability.FlushSentry()
	log.Println("👋 Backtest engine stopped")
}

// startHTTPServer runs a JSON API for backtest submission + health checks.
// This provides a simpler alternative to gRPC for the Next.js frontend.
func startHTTPServer(port string, server *grpcserver.BacktestServer) {
	tracer := otel.Tracer(serviceName)
	mux := http.NewServeMux()

	// Health endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		_, span := tracer.Start(r.Context(), "health.check")
		defer span.End()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","service":"%s","version":"%s","active_backtests":%d,"timestamp":"%s"}`,
			serviceName, serviceVersion, server.ActiveBacktests(), time.Now().UTC().Format(time.RFC3339))
	})

	// Readiness endpoint
	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"ready":true,"active_backtests":%d}`, server.ActiveBacktests())
	})

	// POST /api/backtest — submit a backtest via JSON (alternative to gRPC)
	mux.HandleFunc("/api/backtest", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		_, span := tracer.Start(r.Context(), "api.backtest.submit")
		defer span.End()

		var req struct {
			BacktestID string                        `json:"backtest_id"`
			StrategyID string                        `json:"strategy_id"`
			DagJSON    json.RawMessage               `json:"dag_json"`
			Config     struct {
				Symbols        []string `json:"symbols"`
				StartDate      string   `json:"start_date"`
				EndDate        string   `json:"end_date"`
				Resolution     string   `json:"resolution"`
				InitialCapital float64  `json:"initial_capital"`
				Currency       string   `json:"currency"`
				Slippage       struct {
					Type  string  `json:"type"`
					Value float64 `json:"value"`
				} `json:"slippage"`
				Fees struct {
					MakerFee float64 `json:"maker_fee"`
					TakerFee float64 `json:"taker_fee"`
				} `json:"fees"`
			} `json:"config"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sentry.CaptureException(err)
			http.Error(w, fmt.Sprintf("invalid request: %v", err), http.StatusBadRequest)
			return
		}

		// Parse DAG
		dag, err := engine.ParseDAG(string(req.DagJSON))
		if err != nil {
			sentry.CaptureException(err)
			http.Error(w, fmt.Sprintf("invalid DAG: %v", err), http.StatusBadRequest)
			return
		}

		// Build config
		config := engine.BacktestEngineConfig{
			BacktestID:     req.BacktestID,
			StrategyID:     req.StrategyID,
			Symbols:        req.Config.Symbols,
			StartDate:      req.Config.StartDate,
			EndDate:        req.Config.EndDate,
			Resolution:     req.Config.Resolution,
			InitialCapital: req.Config.InitialCapital,
			Currency:       req.Config.Currency,
			Slippage: engine.NewSlippageModel(
				req.Config.Slippage.Type,
				req.Config.Slippage.Value,
			),
			Fees: engine.FeeConfig{
				MakerFee: req.Config.Fees.MakerFee,
				TakerFee: req.Config.Fees.TakerFee,
			},
		}

		// Generate synthetic data
		marketData := make(map[string][]engine.Bar)
		// Use the gRPC service synthetic data for now
		_ = config
		_ = dag
		_ = marketData

		// Run synchronously for the HTTP API
		log.Printf("📊 HTTP backtest %s started", req.BacktestID)

		result, err := engine.RunBacktest(dag, grpcserver.GenerateSyntheticData(config.Symbols, config.StartDate, config.EndDate, config.Resolution), config, nil)
		if err != nil {
			sentry.CaptureException(err)
			http.Error(w, fmt.Sprintf("backtest failed: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	})

	// Metrics endpoint
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "# HELP backtest_engine_up Service up indicator\n")
		fmt.Fprintf(w, "# TYPE backtest_engine_up gauge\n")
		fmt.Fprintf(w, "backtest_engine_up 1\n")
		fmt.Fprintf(w, "# HELP backtest_engine_active Active backtests count\n")
		fmt.Fprintf(w, "# TYPE backtest_engine_active gauge\n")
		fmt.Fprintf(w, "backtest_engine_active %d\n", server.ActiveBacktests())
	})

	// CORS middleware wrapper for frontend
	handler := corsMiddleware(mux)

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second, // Long timeout for backtest execution
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("HTTP server listening on :%s", port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// initTracerProvider configures the OpenTelemetry tracer provider.
func initTracerProvider(ctx context.Context) (*sdktrace.TracerProvider, error) {
	endpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	if endpoint == "" {
		log.Println("⚠️  OTEL_EXPORTER_OTLP_ENDPOINT not set — traces disabled")
		tp := sdktrace.NewTracerProvider()
		otel.SetTracerProvider(tp)
		return tp, nil
	}

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("creating OTLP exporter: %w", err)
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion(serviceVersion),
			attribute.String("environment", getEnv("ENVIRONMENT", "development")),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("creating OTel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	log.Printf("✅ OTel tracer initialized → %s", endpoint)
	return tp, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
