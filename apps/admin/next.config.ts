import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@syntra/ui", "@syntra/db"],
}

export default nextConfig
