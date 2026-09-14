import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@syntra/ui", "@syntra/db"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig
