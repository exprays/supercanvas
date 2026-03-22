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
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

module.exports = nextConfig;
