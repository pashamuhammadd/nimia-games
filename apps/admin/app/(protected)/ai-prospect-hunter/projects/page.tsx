import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@nimia/db";
import { ProjectsList } from "./ProjectsList";
import { AI_PROSPECT_STATUS_FILTERS } from "../../../lib/aiHunterStatus";

export const metadata = { title: "AI Prospect Hunter · Projects" };

const PAGE_SIZE = 60;

// Consolidates the spec's "Projects / Opportunities / Qualified
// Prospects" nav items (section 15) into one table with status filter
// pills — see ProspectHunterSubNav.tsx's own comment for why.
export default async function AIHunterProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; open?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = createServerClient(await cookies());

  const selectColumns =
    "id, name, symbol, description, categories, logo_url, homepage_url, whitepaper_url, docs_url, explorer_url, blockchain_platforms, " +
    "launch_date, first_listed_at, current_price_usd, market_cap_usd, fully_diluted_valuation_usd, volume_24h_usd, market_cap_rank, " +
    "circulating_supply, total_supply, max_supply, ath_usd, ath_date, atl_usd, atl_date, price_change_24h_pct, social_links, developer_links, " +
    "is_demo, discovered_at, updated_at, " +
    "ai_project_analysis(animation_opportunity, opportunity_score, score_breakdown, project_fit, commercial_potential, recommended_services, reasoning, analysis_status, analyzed_at), " +
    (status && status !== "all"
      ? "ai_prospect_status!inner(id, status, outreach_status, notes)"
      : "ai_prospect_status(id, status, outreach_status, notes)");

  let query = supabase.from("ai_projects").select(selectColumns).order("discovered_at", { ascending: false }).limit(PAGE_SIZE);

  if (status && status !== "all") {
    query = query.eq("ai_prospect_status.status", status);
  }

  const { data: projects } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {AI_PROSPECT_STATUS_FILTERS.map((filter) => {
          const isActive = (status ?? "all") === filter.value;
          const href = filter.value === "all" ? "/ai-prospect-hunter/projects" : `/ai-prospect-hunter/projects?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-[var(--nimia-crimson)]/15 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
                  : "rounded-full px-3.5 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* useSearchParams (for the `?open=<id>` deep link from Overview)
          needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <ProjectsList projects={(projects as any) ?? []} />
      </Suspense>
    </div>
  );
}
