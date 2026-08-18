import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local workspace packages ship raw .ts/.tsx with no build step of their
  // own (same convention as every other app in this monorepo — see
  // apps/studio/next.config.ts's identical comment).
  transpilePackages: ["@nimia/ui", "@nimia/db"],

  images: {
    // next/image is only ever pointed at Cloudinary-hosted THUMBNAILS
    // (already-optimized f_auto,q_auto derived images — see
    // lib/cloudinary-url.ts). This is deliberately NOT a security concern
    // the way the video source is (see app/api/video/[id]/route.ts's own
    // comment on that distinction): a public, cacheable, CDN-served
    // thumbnail is the whole point of Cloudinary's image delivery, and
    // Google/social crawlers need a directly fetchable URL for OG images
    // and image search anyway.
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
