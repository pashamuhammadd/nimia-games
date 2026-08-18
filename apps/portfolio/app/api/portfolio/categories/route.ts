import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { getPortfolioCategories } from "../../../../lib/portfolio-queries";

// GET /api/portfolio/categories — powers the Portfolio Navigation row
// (spec §6). A new category added via admin (packages/db's
// `portfolio_categories` table) shows up here automatically, no frontend
// code change needed.
export async function GET() {
  const supabase = createServerClient(await cookies());
  try {
    const categories = await getPortfolioCategories(supabase);
    return NextResponse.json(
      { categories },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 });
  }
}
