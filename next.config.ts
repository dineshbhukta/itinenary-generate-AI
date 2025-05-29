import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // 🚨 Disables type checking during the build
  },
};

export default nextConfig;
