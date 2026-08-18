import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PortfolioExperience } from "./components/PortfolioExperience";
import {
  getPortfolioList,
  getPortfolioCategories,
  getFeaturedPortfolioItem,
  getPortfolioItemBySlug,
} from "../lib/portfolio-queries";
import type { PortfolioFormat, PortfolioSort } from "../lib/portfolio-types";

const VALID_FORMATS: PortfolioFormat[] = ["1:1", "16:9", "9:16", "gif"];
const VALID_SORTS: PortfolioSort[] = ["latest", "oldest", "featured", "az"];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Server component: does the first, SSR'd fetch (fast initial paint, real
// content in the HTML for crawlers/SEO — spec §20/§28) and hands off to
// PortfolioExperience (client) for every interaction afterwards. Reads
// category/format/sort/work straight from the URL so a deep link (spec
// §29, e.g. portfolio.nimiastudio.com/?category=cinematic&work=sunset-
// village) renders the right filtered grid AND the right modal open on
// the very first response, not after a client-side re-fetch.
export default async function PortfolioHomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = typeof params.category === "string" ? params.category : null;
  const formatParam = typeof params.format === "string" ? params.format : null;
  const sortParam = typeof params.sort === "string" ? params.sort : null;
  const workParam = typeof params.work === "string" ? params.work : null;

  const format = VALID_FORMATS.includes(formatParam as PortfolioFormat) ? (formatParam as PortfolioFormat) : null;
  const sort: PortfolioSort = VALID_SORTS.includes(sortParam as PortfolioSort) ? (sortParam as PortfolioSort) : "latest";

  const supabase = createServerClient(await cookies());

  const [list, categories, featured] = await Promise.all([
    getPortfolioList(supabase, { page: 1, category: categoryParam ?? undefined, format: format ?? undefined, sort }),
    getPortfolioCategories(supabase),
    getFeaturedPortfolioItem(supabase),
  ]);

  const directWorkItem =
    workParam && !list.items.some((item) => item.slug === workParam)
      ? await getPortfolioItemBySlug(supabase, workParam)
      : null;

  return (
    <PortfolioExperience
      initialItems={list.items}
      initialTotal={list.total}
      initialHasMore={list.hasMore}
      categories={categories}
      featured={featured}
      initialCategory={categoryParam}
      initialFormat={format}
      initialSort={sort}
      initialWorkSlug={workParam}
      initialWorkItem={directWorkItem}
    />
  );
}
