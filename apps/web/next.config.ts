import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = {
  transpilePackages: ["@syntra/ui", "@syntra/db"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default withSentryConfig(nextConfig, {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: { treeshake: { removeDebugLogging: true } },
  // Skip source map upload entirely when no auth token is configured,
  // so local and preview builds don't fail on a missing Sentry setup.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})
