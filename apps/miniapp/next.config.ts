import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local workspace packages ship raw .ts/.tsx with no build step of
  // their own (same convention as every other app in this monorepo —
  // see apps/portfolio/next.config.ts's identical comment). @nimia/telegram
  // is new here — nothing else in the monorepo imports it from an app
  // yet (packages/telegram was only ever imported from apps/admin's
  // server-side AI Prospect Hunter code before this app existed).
  transpilePackages: ["@nimia/ui", "@nimia/db", "@nimia/telegram"],

  images: {
    // Service/portfolio thumbnails are Cloudinary-hosted, same pattern
    // as apps/portfolio's own next.config.ts — kept here even though the
    // Services tab is still a placeholder (docs/TELEGRAM.md's Phase 2)
    // so wiring in real thumbnails later doesn't need a config change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
