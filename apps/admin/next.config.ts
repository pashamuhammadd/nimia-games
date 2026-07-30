import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same reasoning as apps/studio/next.config.ts — local workspace packages
  // (@nimia/*) ship raw .ts/.tsx source with no build step of their own, so
  // Next.js has to transpile them itself.
  transpilePackages: ["@nimia/ui", "@nimia/db"],
};

export default nextConfig;
