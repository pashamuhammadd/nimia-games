import type { SupabaseClient } from "@supabase/supabase-js";
import { buildThumbnailFallback, buildThumbnailSrcSet, buildThumbnailUrl, buildAnimatedGifUrl } from "./cloudinary-url";
import type {
  PortfolioCategory,
  PortfolioFormat,
  PortfolioItem,
  PortfolioListParams,
  PortfolioListResult,
} from "./portfolio-types";

// `Database` is `any` in @nimia/db today (packages/db/src/types.ts is a
// placeholder until real types are generated — same as every other app in
// this monorepo), so query results are cast through this loose row shape
// rather than fighting the client's generics. Matches the established
// convention elsewhere (e.g. apps/admin/app/(protected)/services/page.tsx's
// `data as any as ServiceRow[]`).
interface PortfolioCategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface PortfolioTagRow {
  name: string;
  slug: string;
}

interface PortfolioRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  client: string | null;
  project: string | null;
  year: number | null;
  duration_seconds: number | null;
  cloudinary_public_id: string | null;
  cloudinary_thumbnail_public_id: string | null;
  resource_type: "image" | "video";
  format: PortfolioFormat | null;
  width: number | null;
  height: number | null;
  featured: boolean;
  status: "draft" | "published" | "archived";
  sort_order: number;
  created_at: string;
  category: PortfolioCategoryRow | PortfolioCategoryRow[] | null;
  portfolio_tag_map: { portfolio_tags: PortfolioTagRow | PortfolioTagRow[] | null }[] | null;
}

const SELECT_COLUMNS = `
  id, slug, title, description, client, project, year, duration_seconds,
  cloudinary_public_id, cloudinary_thumbnail_public_id, resource_type,
  format, width, height, featured, status, sort_order, created_at,
  portfolio_tag_map ( portfolio_tags ( name, slug ) )
`;

function normalizeOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapRowToPortfolioItem(row: PortfolioRow): PortfolioItem {
  const category = normalizeOne(row.category);
  const publicId = row.cloudinary_public_id ?? "";
  const posterPublicId = row.cloudinary_thumbnail_public_id || publicId;

  const tags = (row.portfolio_tag_map ?? [])
    .map((entry) => normalizeOne(entry.portfolio_tags)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    client: row.client,
    project: row.project,
    year: row.year,
    durationSeconds: row.duration_seconds,
    resourceType: row.resource_type,
    format: row.format,
    width: row.width,
    height: row.height,
    featured: row.featured,
    tags,
    thumbnailSrc: publicId ? buildThumbnailFallback(posterPublicId, row.resource_type) : "",
    thumbnailSrcSet: publicId ? buildThumbnailSrcSet(posterPublicId, row.resource_type) : "",
    fullImageSrc:
      publicId && row.resource_type === "image" ? buildThumbnailUrl(publicId, "image", 1600) : null,
    videoSrc: row.resource_type === "video" ? `/api/video/${row.slug}` : null,
    gifSrc: row.resource_type === "image" && row.format === "gif" ? buildAnimatedGifUrl(publicId) : null,
    createdAt: row.created_at,
  };
}

export async function getPortfolioCategories(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<PortfolioCategory[]> {
  const { data, error } = await supabase
    .from("portfolio_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as PortfolioCategory[];
}

const DEFAULT_PAGE_SIZE = 24;

export async function getPortfolioList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: PortfolioListParams,
): Promise<PortfolioListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(60, Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Category filter needs an INNER join on the embedded resource so
  // PostgREST can filter by its column (a plain left-embed can't be
  // filtered on directly) — see PostgREST's "embedded filters" docs. Built
  // as two branches rather than one dynamic string so the common
  // (no-filter) path stays a plain, cheap left join.
  const categorySlug = params.category && params.category !== "all" ? params.category : null;
  const selectColumns = categorySlug
    ? SELECT_COLUMNS.replace(
        "portfolio_tag_map",
        `category:portfolio_categories!inner ( id, name, slug ), portfolio_tag_map`,
      )
    : SELECT_COLUMNS.replace(
        "portfolio_tag_map",
        `category:portfolio_categories ( id, name, slug ), portfolio_tag_map`,
      );

  let query = supabase.from("portfolio").select(selectColumns, { count: "exact" }).eq("status", "published");

  if (categorySlug) {
    query = query.eq("category.slug", categorySlug);
  }
  if (params.format) {
    query = query.eq("format", params.format);
  }
  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim().replace(/[%_]/g, "");
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,client.ilike.%${term}%,project.ilike.%${term}%`,
    );
  }

  switch (params.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "featured":
      query = query.order("featured", { ascending: false }).order("sort_order", { ascending: false });
      break;
    case "az":
      query = query.order("title", { ascending: true });
      break;
    case "latest":
    default:
      query = query.order("sort_order", { ascending: false }).order("created_at", { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    return { items: [], total: 0, page, limit, hasMore: false };
  }

  const items = (data as unknown as PortfolioRow[]).map(mapRowToPortfolioItem);
  const total = count ?? items.length;

  return {
    items,
    total,
    page,
    limit,
    hasMore: from + items.length < total,
  };
}

// Powers the Hero / Featured Work section (spec §5). Prefers an
// admin-marked `featured` item; falls back to the single latest published
// item so the hero never renders empty just because nothing's been
// flagged featured yet.
export async function getFeaturedPortfolioItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<PortfolioItem | null> {
  const selectColumns = SELECT_COLUMNS.replace(
    "portfolio_tag_map",
    `category:portfolio_categories ( id, name, slug ), portfolio_tag_map`,
  );

  const { data: featuredRow } = await supabase
    .from("portfolio")
    .select(selectColumns)
    .eq("status", "published")
    .eq("featured", true)
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (featuredRow) return mapRowToPortfolioItem(featuredRow as unknown as PortfolioRow);

  const { data: latestRow } = await supabase
    .from("portfolio")
    .select(selectColumns)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return latestRow ? mapRowToPortfolioItem(latestRow as unknown as PortfolioRow) : null;
}

export async function getPortfolioItemBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  slug: string,
): Promise<PortfolioItem | null> {
  const selectColumns = SELECT_COLUMNS.replace(
    "portfolio_tag_map",
    `category:portfolio_categories ( id, name, slug ), portfolio_tag_map`,
  );
  const { data, error } = await supabase
    .from("portfolio")
    .select(selectColumns)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToPortfolioItem(data as unknown as PortfolioRow);
}
