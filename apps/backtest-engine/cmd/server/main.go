// ─────────────────────────────────────────────
// SuperCanvas — Go Backtest Engine
// gRPC + HTTP health server with OpenTelemetry instrumentation
// ─────────────────────────────────────────────

package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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
	serviceVersion  = "0.1.0"
)

func main() {
	grpcPort := getEnv("GRPC_PORT", defaultGRPCPort)
	httpPort := getEnv("HTTP_PORT", defaultHTTPPort)

	log.Printf("🚀 SuperCanvas Backtest Engine starting...")
	log.Printf("   gRPC port: %s", grpcPort)
	log.Printf("   HTTP port: %s (health check)", httpPort)

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

	// ── Start health check HTTP server ──
	go startHealthServer(httpPort)

	// ── Start gRPC server (stub) ──
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", grpcPort, err)
	}
	defer lis.Close()

	log.Printf("✅ gRPC server listening on :%s", grpcPort)
	log.Printf("✅ Health check at http://localhost:%s/health", httpPort)
	log.Printf("✅ OpenTelemetry tracing enabled → %s", getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "disabled"))

	// ── Graceful shutdown ──
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("🛑 Shutting down gracefully...")
	log.Println("👋 Backtest engine stopped")
}

// initTracerProvider configures the OpenTelemetry tracer provider.
// Exports to an OTLP endpoint (Grafana Cloud / local collector).
func initTracerProvider(ctx context.Context) (*sdktrace.TracerProvider, error) {
	endpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
	if endpoint == "" {
		// No endpoint configured — use a no-op provider
		log.Println("⚠️  OTEL_EXPORTER_OTLP_ENDPOINT not set — traces disabled")
		tp := sdktrace.NewTracerProvider()
		otel.SetTracerProvider(tp)
		return tp, nil
	}

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(), // Use TLS in prod — set OTEL_EXPORTER_OTLP_INSECURE=false
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
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))), // 10% sampling
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	log.Printf("✅ OTel tracer initialized → %s", endpoint)
	return tp, nil
}

// startHealthServer runs a lightweight HTTP server for K8s probes and Prometheus scraping.
func startHealthServer(port string) {
	tracer := otel.Tracer(serviceName)
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		_, span := tracer.Start(r.Context(), "health.check")
		defer span.End()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","service":"%s","version":"%s","timestamp":"%s"}`,
			serviceName, serviceVersion, time.Now().UTC().Format(time.RFC3339))
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		// TODO Phase 2: Check DB connections, Redis, worker pool health
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"ready":true,"workers":0,"queue_depth":0}`)
	})

	// Lightweight metrics endpoint for Prometheus (will be expanded in Phase 2)
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "# HELP backtest_engine_up Service up indicator\n")
		fmt.Fprintf(w, "# TYPE backtest_engine_up gauge\n")
		fmt.Fprintf(w, "backtest_engine_up 1\n")
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Health server listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Health server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
