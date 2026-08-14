import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local workspace packages (@nimia/*) ship raw .ts/.tsx source with no
  // build step of their own — this tells Next.js's compiler to transpile
  // them itself, same as it does for app code, instead of expecting
  // pre-built JS in their dist/ (which doesn't exist).
  transpilePackages: ["@nimia/ui", "@nimia/db", "@nimia/validators"],
};

export default nextConfig;
