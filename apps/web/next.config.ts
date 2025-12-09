import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mise-pos/database",
    "@mise-pos/types",
    "@mise-pos/config",
    "@mise-pos/ai",
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
