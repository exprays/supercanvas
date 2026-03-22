// ─────────────────────────────────────────────
// SuperCanvas — Next.js Instrumentation Hook
// OTel tracing → Grafana Cloud OTLP
// instrumentation.ts (Next.js 14 App Router)
// ─────────────────────────────────────────────

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { Resource } = await import("@opentelemetry/resources");
    const {
      SEMRESATTRS_SERVICE_NAME,
      SEMRESATTRS_SERVICE_VERSION,
      SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
    } = await import("@opentelemetry/semantic-conventions");
    const { BatchSpanProcessor } = await import(
      "@opentelemetry/sdk-trace-base"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );

    const grafanaEndpoint = process.env.GRAFANA_OTLP_ENDPOINT;
    const grafanaToken = process.env.GRAFANA_OTLP_TOKEN;

    // Only configure OTLP export if Grafana credentials are present
    const spanProcessors = grafanaEndpoint
      ? [
          new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: `${grafanaEndpoint}/v1/traces`,
              headers: grafanaToken
                ? { Authorization: `Basic ${grafanaToken}` }
                : {},
            })
          ),
        ]
      : [];

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: "supercanvas-web",
        [SEMRESATTRS_SERVICE_VERSION]:
          process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV ?? "development",
      }),
      spanProcessors: spanProcessors as any,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy instrumentations
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: false },
        }),
      ],
    });

    sdk.start();

    if (grafanaEndpoint) {
      console.log(
        `[OTel] Traces → Grafana Cloud: ${grafanaEndpoint}`
      );
    } else {
      console.log(
        "[OTel] GRAFANA_OTLP_ENDPOINT not set — traces disabled"
      );
    }

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk.shutdown().catch(console.error);
    });
  }

  // Wire Sentry on both edge and nodejs runtimes
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    await import("./sentry.server.config");
  }
}
