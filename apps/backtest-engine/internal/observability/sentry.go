// ─────────────────────────────────────────────
// SuperCanvas — Sentry Integration for Go Engine
// Error tracking, performance monitoring, gRPC interceptor
// ─────────────────────────────────────────────

package observability

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
)

const (
	releaseVersion = "backtest-engine@0.1.0"
)

// InitSentry initialises the Sentry SDK.
func InitSentry() error {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		log.Println("⚠️  SENTRY_DSN not set — Sentry disabled")
		return nil
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Release:          releaseVersion,
		Environment:      env,
		TracesSampleRate: 0.2, // Sample 20% of transactions
		EnableTracing:    true,
		Debug:            env == "development",
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Add backtest engine context
			event.Tags["service"] = "backtest-engine"
			return event
		},
	})
	if err != nil {
		return fmt.Errorf("sentry init: %w", err)
	}

	log.Printf("✅ Sentry initialized → %s", env)
	return nil
}

// FlushSentry flushes buffered events before shutdown.
func FlushSentry() {
	sentry.Flush(2 * time.Second)
}

// CaptureError reports an error to Sentry with optional context.
func CaptureError(err error, tags map[string]string) {
	if err == nil {
		return
	}

	hub := sentry.CurrentHub().Clone()
	hub.ConfigureScope(func(scope *sentry.Scope) {
		for k, v := range tags {
			scope.SetTag(k, v)
		}
	})
	hub.CaptureException(err)
}

// AddBreadcrumb adds a breadcrumb to the current Sentry scope.
func AddBreadcrumb(category, message string, data map[string]interface{}) {
	sentry.AddBreadcrumb(&sentry.Breadcrumb{
		Category:  category,
		Message:   message,
		Data:      data,
		Level:     sentry.LevelInfo,
		Timestamp: time.Now(),
	})
}

// StartTransaction begins a Sentry performance transaction.
func StartTransaction(ctx context.Context, name, op string) (*sentry.Span, context.Context) {
	span := sentry.StartSpan(ctx, op, sentry.WithTransactionName(name))
	return span, span.Context()
}

// ── gRPC Interceptors ───────────────────────────────────────────────────────

// UnaryServerInterceptor returns a gRPC interceptor that reports errors to Sentry.
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (resp interface{}, err error) {
		hub := sentry.GetHubFromContext(ctx)
		if hub == nil {
			hub = sentry.CurrentHub().Clone()
		}
		hub.Scope().SetTag("grpc.method", info.FullMethod)

		span := sentry.StartSpan(ctx, "grpc.server",
			sentry.WithTransactionName(info.FullMethod))
		defer span.Finish()

		defer func() {
			if r := recover(); r != nil {
				err := fmt.Errorf("panic in %s: %v", info.FullMethod, r)
				hub.CaptureException(err)
				hub.Flush(2 * time.Second)
				panic(r) // re-panic after reporting
			}
		}()

		resp, err = handler(span.Context(), req)
		if err != nil {
			st, _ := status.FromError(err)
			hub.Scope().SetTag("grpc.status", st.Code().String())
			hub.CaptureException(err)
		}

		return resp, err
	}
}

// StreamServerInterceptor returns a gRPC stream interceptor for Sentry.
func StreamServerInterceptor() grpc.StreamServerInterceptor {
	return func(
		srv interface{},
		ss grpc.ServerStream,
		info *grpc.StreamServerInfo,
		handler grpc.StreamHandler,
	) error {
		hub := sentry.CurrentHub().Clone()
		hub.Scope().SetTag("grpc.method", info.FullMethod)
		hub.Scope().SetTag("grpc.stream", "true")

		span := sentry.StartSpan(ss.Context(), "grpc.server.stream",
			sentry.WithTransactionName(info.FullMethod))
		defer span.Finish()

		AddBreadcrumb("grpc", fmt.Sprintf("Stream started: %s", info.FullMethod), nil)

		defer func() {
			if r := recover(); r != nil {
				err := fmt.Errorf("panic in stream %s: %v", info.FullMethod, r)
				hub.CaptureException(err)
				hub.Flush(2 * time.Second)
				panic(r)
			}
		}()

		err := handler(srv, ss)
		if err != nil {
			st, _ := status.FromError(err)
			hub.Scope().SetTag("grpc.status", st.Code().String())
			hub.CaptureException(err)
		}

		return err
	}
}
