import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { getPortfolioItemBySlug } from "../../../../lib/portfolio-queries";

// GET /api/portfolio/[slug] — single item, used by the modal's deep-link
// path (?work=slug, spec §29) to fetch/share one item without a dedicated
// page per work.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient(await cookies());

  try {
    const item = await getPortfolioItemBySlug(supabase, slug);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { item },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load this item right now." }, { status: 500 });
  }
}
