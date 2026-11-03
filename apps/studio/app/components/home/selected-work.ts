import { createClient } from "@supabase/supabase-js";
import { buildThumbnailSrcSet, buildThumbnailUrl } from "../../../lib/cloudinary-url";
import { FULL_PORTFOLIO_URL } from "../../portfolio/data";

// Selected Work on the redesigned homepage reads the REAL portfolio table
// (published rows only — RLS policy portfolio_public_read_published, 0052),
// ordered the same way portfolio.nimiastudio.com orders its default view
// (featured first, then sort_order). Nothing here falls back to the
// illustrations from the approved preview image: those were placeholders,
// not real work (docs/nimia-studio-redesign/01-KEPUTUSAN.md).

export interface SelectedWorkItem {
  id: string;
  title: string;
  category: string | null;
  imageSrc: string;
  imageSrcSet: string;
  width: number | null;
  height: number | null;
  href: string;
}

export type SelectedWorkResult =
  | { status: "ok"; items: SelectedWorkItem[] }
  | { status: "empty" }
  | { status: "unavailable" };

export interface PortfolioRow {
  id: string;
  slug: string;
  title: string;
  cloudinary_public_id: string | null;
  cloudinary_thumbnail_public_id: string | null;
  resource_type: "image" | "video" | null;
  width: number | null;
  height: number | null;
  category: { name: string } | { name: string }[] | null;
}

const SELECT_COLUMNS =
  "id, slug, title, cloudinary_public_id, cloudinary_thumbnail_public_id, resource_type, width, height, category:portfolio_categories ( name )";

const QUERY_TIMEOUT_MS = 4000;

export function mapPortfolioRows(rows: PortfolioRow[], cloudName: string): SelectedWorkItem[] {
  const items: SelectedWorkItem[] = [];
  for (const row of rows) {
    const resourceType = row.resource_type === "image" ? "image" : "video";
    // A video's poster frame comes from the thumbnail asset when one was
    // curated, otherwise frame 0 of the video itself.
    const thumbnailId = row.cloudinary_thumbnail_public_id || row.cloudinary_public_id;
    if (!thumbnailId) continue;
    const thumbnailType = row.cloudinary_thumbnail_public_id ? "image" : resourceType;
    const category = Array.isArray(row.category) ? row.category[0] : row.category;

    items.push({
      id: row.id,
      title: row.title,
      category: category?.name ?? null,
      imageSrc: buildThumbnailUrl(cloudName, thumbnailId, thumbnailType, 960),
      imageSrcSet: buildThumbnailSrcSet(cloudName, thumbnailId, thumbnailType),
      width: row.width,
      height: row.height,
      href: `${FULL_PORTFOLIO_URL}/?work=${encodeURIComponent(row.slug)}`,
    });
  }
  return items;
}

export async function getSelectedWork(limit = 3): Promise<SelectedWorkResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!supabaseUrl || !anonKey || !cloudName) {
    return { status: "unavailable" };
  }

  try {
    // Anonymous, cookie-less client on purpose: this is public data and
    // must look identical for every visitor, signed in or not.
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) }),
      },
    });

    const { data, error } = await supabase
      .from("portfolio")
      .select(SELECT_COLUMNS)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[home] selected work query failed:", error.message);
      return { status: "unavailable" };
    }

    const items = mapPortfolioRows((data ?? []) as unknown as PortfolioRow[], cloudName);
    return items.length > 0 ? { status: "ok", items } : { status: "empty" };
  } catch (error) {
    console.error("[home] selected work query failed:", error);
    return { status: "unavailable" };
  }
}
