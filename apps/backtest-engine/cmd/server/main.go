// ─────────────────────────────────────────────
// SuperCanvas — Go Backtest Engine (Scaffold)
// gRPC service for tick-by-tick backtest execution
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
)

const (
	defaultGRPCPort = "50051"
	defaultHTTPPort = "8080"
)

func main() {
	grpcPort := getEnv("GRPC_PORT", defaultGRPCPort)
	httpPort := getEnv("HTTP_PORT", defaultHTTPPort)

	log.Printf("🚀 SuperCanvas Backtest Engine starting...")
	log.Printf("   gRPC port: %s", grpcPort)
	log.Printf("   HTTP port: %s (health check)", httpPort)

	// Start health check HTTP server
	go startHealthServer(httpPort)

	// Start gRPC server
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", grpcPort, err)
	}

	log.Printf("✅ gRPC server listening on :%s", grpcPort)
	log.Printf("✅ Health check at http://localhost:%s/health", httpPort)

	// Graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("🛑 Shutting down gracefully...")
		cancel()
	}()

	// Block until context is cancelled
	<-ctx.Done()
	_ = lis.Close()
	log.Println("👋 Backtest engine stopped")
}

func startHealthServer(port string) {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"ok","service":"backtest-engine","version":"0.0.1"}`)
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Check DB connections, worker pool status
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"ready":true}`)
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

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
