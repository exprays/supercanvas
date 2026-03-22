// ─────────────────────────────────────────────
// SuperCanvas — Next.js Config (Phase 1)
// Adds Sentry, OTel instrumentation hook, ReactFlow
// ─────────────────────────────────────────────

const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@supercanvas/types",
    "@supercanvas/db",
    "@supercanvas/inngest-fns",
    "@supercanvas/ui",
  ],

  experimental: {
    serverComponentsExternalPackages: ["@neondatabase/serverless"],
    // Enable the instrumentation.ts hook for OTel
    instrumentationHook: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation + project (set in CI/Vercel env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI
  silent: !process.env.CI,

  // Source map upload for readable stack traces in Sentry
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,

  // Automatically tree-shake Sentry debug code
  automaticVercelMonitors: true,
});
