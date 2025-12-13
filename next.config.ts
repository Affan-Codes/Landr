import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable source maps for production debugging
  productionBrowserSourceMaps: true,

  experimental: {
    useCache: true,
  },
};

export default nextConfig;
