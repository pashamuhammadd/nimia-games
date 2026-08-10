import type { MetadataRoute } from "next";

// SEO fix, 10 Agustus 2026 — studio never had a sitemap at all. Lists only
// the public marketing/funnel routes; /login, /register, and everything
// under /dashboard/* are deliberately left out (see app/robots.ts and
// app/dashboard/layout.tsx) since they're either auth-gated or noindexed —
// pointing crawlers at pages they can't or shouldn't index would just
// waste crawl budget. Same pattern as apps/www/app/sitemap.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://studio.nimiagames.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/partners`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/why-nimia`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/how-to-start`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/order`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
