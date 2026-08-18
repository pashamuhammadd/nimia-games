import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { getPortfolioList } from "../../../lib/portfolio-queries";
import type { PortfolioFormat, PortfolioSort } from "../../../lib/portfolio-types";

const VALID_FORMATS: PortfolioFormat[] = ["1:1", "16:9", "9:16", "gif"];
const VALID_SORTS: PortfolioSort[] = ["latest", "oldest", "featured", "az"];

// GET /api/portfolio?page=1&limit=24&category=cinematic&format=16:9&sort=latest&search=sunset
//
// Public, paginated, category/format-filterable, sortable, searchable
// listing (spec §18/§19). Backed by RLS (createServerClient with no admin
// session only ever sees `status = 'published'` rows — see
// packages/db/migrations/0052's `portfolio_public_read_published` policy),
// not an application-level filter, so there's no way for this route to
// accidentally leak a draft/archived item.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const page = Number(params.get("page")) || 1;
  const limit = Number(params.get("limit")) || undefined;
  const category = params.get("category") || undefined;
  const formatParam = params.get("format");
  const format = VALID_FORMATS.includes(formatParam as PortfolioFormat) ? (formatParam as PortfolioFormat) : undefined;
  const sortParam = params.get("sort");
  const sort = VALID_SORTS.includes(sortParam as PortfolioSort) ? (sortParam as PortfolioSort) : "latest";
  const search = params.get("search") || undefined;

  const supabase = createServerClient(await cookies());

  try {
    const result = await getPortfolioList(supabase, { page, limit, category, format, sort, search });
    return NextResponse.json(result, {
      headers: {
        // Short public/CDN cache — the gallery updates via sync/webhook,
        // not every request, so a brief cache window keeps this fast at
        // scale without serving stale results for long (spec §20).
        "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    // Never leak internals (spec §30 — "Do not expose technical errors to
    // visitors").
    return NextResponse.json(
      { error: "Unable to load the portfolio right now. Please try again." },
      { status: 500 },
    );
  }
}
