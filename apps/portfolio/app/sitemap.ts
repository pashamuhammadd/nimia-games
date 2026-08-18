import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { getPortfolioCategories } from "../lib/portfolio-queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.nimiastudio.com";

// Individual works don't get their own indexable page (spec §29: the modal
// + ?work= deep link is the primary interaction, not per-item pages), so
// this lists the homepage plus one entry per category filter view — real
// distinct, crawlable, indexable URLs (portfolio.nimiastudio.com/?category=
// cinematic etc.) without the maintenance cost of a page-per-asset sitemap
// at 300-1,000+ item scale.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient(await cookies());
  const categories = await getPortfolioCategories(supabase);

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...categories.map((category) => ({
      url: `${SITE_URL}/?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
