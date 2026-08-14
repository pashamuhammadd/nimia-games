import type { NextConfig } from "next";

// This app's own public URL for the routes redirected below — falls back
// to the production app subdomain if unset (matches the fallback pattern
// used throughout this app's own env-var reads).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com";

const nextConfig: NextConfig = {
  // Local workspace packages (@nimia/*) ship raw .ts/.tsx source with no
  // build step of their own — this tells Next.js's compiler to transpile
  // them itself, same as it does for app code, instead of expecting
  // pre-built JS in their dist/ (which doesn't exist).
  transpilePackages: ["@nimia/ui", "@nimia/db", "@nimia/validators"],

  // Dashboard split (14 Agustus 2026) — /login, /register, /order,
  // /dashboard/*, /r/:code, and their supporting API routes moved to a new
  // app (apps/app, app.nimiastudio.com — see [[studio_multi_app_split_plan]]
  // in project memory). Their source files are still physically present
  // under this app's app/ directory for now (nothing was deleted — see
  // delete-old-app-split-files.ps1 at the repo root for the cleanup step),
  // but these redirects make sure nobody — a bookmark, an old email link,
  // a search result — ever actually reaches that dormant copy. Permanent
  // (308) since this is a real, final move, not a temporary detour.
  async redirects() {
    return [
      { source: "/login", destination: `${APP_URL}/login`, permanent: true },
      { source: "/register", destination: `${APP_URL}/register`, permanent: true },
      {
        source: "/register/:path*",
        destination: `${APP_URL}/register/:path*`,
        permanent: true,
      },
      { source: "/order", destination: `${APP_URL}/order`, permanent: true },
      {
        source: "/dashboard",
        destination: `${APP_URL}/dashboard`,
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: `${APP_URL}/dashboard/:path*`,
        permanent: true,
      },
      { source: "/r/:code", destination: `${APP_URL}/r/:code`, permanent: true },
      {
        source: "/api/discord/:path*",
        destination: `${APP_URL}/api/discord/:path*`,
        permanent: true,
      },
      {
        source: "/api/orders/:path*",
        destination: `${APP_URL}/api/orders/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
