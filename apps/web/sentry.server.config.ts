// ─────────────────────────────────────────────
// SuperCanvas — Sentry Server Instrumentation
// sentry.server.config.ts
// Wires Sentry + Grafana Cloud OTel traces
// ─────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture all server transactions (Next.js server is low-traffic in dev)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Forward traces to Grafana Cloud via OTLP
  // Grafana Cloud provides an OTLP endpoint that accepts Sentry-compatible traces
  integrations: process.env.GRAFANA_OTLP_ENDPOINT
    ? [
        // OTel integration wired via next.config.js instrumentationHook
      ]
    : [],

  debug: false,

  beforeSend(event) {
    // Strip PII from error messages in production
    if (process.env.NODE_ENV === "production") {
      if (event.request?.cookies) event.request.cookies = {};
      if (event.request?.headers) {
        const { authorization, cookie, ...safeHeaders } =
          event.request.headers as Record<string, string>;
        event.request.headers = safeHeaders;
      }
    }
    return event;
  },
});
