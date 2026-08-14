import type { MetadataRoute } from "next";

// SEO fix, 10 Agustus 2026 — studio never had a robots.txt at all (see
// app/layout.tsx for the bigger noindex bug this was found alongside).
// Same pattern as apps/www/app/robots.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Crawl-budget hygiene only — NOT how /login and /register stay
        // out of the index (that's the per-route `robots: {index:false}`
        // metadata on those pages, and on app/dashboard/layout.tsx for the
        // whole client-portal subtree). Disallowing /login or /register
        // here too would stop Google from ever crawling far enough to see
        // that noindex tag, which can leave a bare, snippet-less URL
        // floating in search results instead of being cleanly dropped —
        // so only genuinely non-page paths are disallowed here.
        disallow: ["/dashboard/", "/api/", "/r/"],
      },
    ],
    sitemap: "https://nimiastudio.com/sitemap.xml",
    host: "https://nimiastudio.com",
  };
}
