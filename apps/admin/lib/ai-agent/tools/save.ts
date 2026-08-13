import type { createServerClient } from "@nimia/db";
import type { AnalyzedProject } from "../types";
import { QUALIFIED_SCORE_THRESHOLD, OPPORTUNITY_SCORE_THRESHOLD } from "../constants";

type SupabaseClient = ReturnType<typeof createServerClient>;

// Tool: save_project — the ONLY place in this module that writes to
// ai_projects / ai_project_analysis / ai_prospect_status. Three separate
// upserts, all keyed off the same project — see packages/db/migrations/
// 0040_ai_prospect_hunter.sql's own top comment for why these are three
// tables instead of one wide row: source data (ai_projects) must never be
// confused with AI interpretation (ai_project_analysis), and a human's
// manual pipeline-stage decision (ai_prospect_status) must never be
// silently overwritten by a later re-analysis of the same project.
export async function saveProject(
  supabase: SupabaseClient,
  analyzed: AnalyzedProject,
): Promise<{ projectId: string } | { error: string }> {
  const p = analyzed.project;

  // ---- ai_projects (source of truth) ----
  const projectRow: Record<string, unknown> = {
    coingecko_id: p.coingeckoId,
    name: p.name,
    symbol: p.symbol,
    description: p.description,
    categories: p.categories,
    logo_url: p.logoUrl,
    homepage_url: p.homepageUrl,
    whitepaper_url: p.whitepaperUrl,
    docs_url: p.docsUrl,
    explorer_url: p.explorerUrl,
    blockchain_platforms: p.blockchainPlatforms,
    launch_date: p.launchDate,
    first_listed_at: p.firstListedAt,
    current_price_usd: p.currentPriceUsd,
    market_cap_usd: p.marketCapUsd,
    fully_diluted_valuation_usd: p.fullyDilutedValuationUsd,
    volume_24h_usd: p.volume24hUsd,
    market_cap_rank: p.marketCapRank,
    circulating_supply: p.circulatingSupply,
    total_supply: p.totalSupply,
    max_supply: p.maxSupply,
    ath_usd: p.athUsd,
    ath_date: p.athDate,
    atl_usd: p.atlUsd,
    atl_date: p.atlDate,
    price_change_24h_pct: p.priceChange24hPct,
    social_links: p.socialLinks,
    developer_links: p.developerLinks,
    raw_source_data: p.rawSourceData,
    is_demo: p.isDemo,
  };

  const { data: savedProject, error: projectError } = await supabase
    .from("ai_projects")
    .upsert(projectRow, { onConflict: "coingecko_id" })
    .select("id")
    .single();

  if (projectError || !savedProject) {
    return { error: projectError?.message ?? "Failed to save project." };
  }
  const projectId = (savedProject as { id: string }).id;

  // ---- ai_project_analysis (AI interpretation — always refreshed) ----
  const { error: analysisError } = await supabase.from("ai_project_analysis").upsert(
    {
      project_id: projectId,
      run_id: analyzed.runId,
      analysis_status: "completed",
      animation_opportunity: analyzed.animationOpportunity,
      opportunity_score: analyzed.opportunityScore,
      score_breakdown: analyzed.scoreBreakdown,
      project_fit: analyzed.projectFit,
      commercial_potential: analyzed.commercialPotential,
      recommended_services: analyzed.recommendedServices,
      reasoning: analyzed.reasoning,
      analyzed_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (analysisError) {
    return { error: analysisError.message };
  }

  // ---- ai_prospect_status (human pipeline stage — admin-managed stages protected) ----
  const { data: existingStatus } = await supabase
    .from("ai_prospect_status")
    .select("id, status")
    .eq("project_id", projectId)
    .maybeSingle();

  const ADMIN_MANAGED_STAGES = ["contacted", "replied", "negotiation", "client", "rejected"];
  const isAdminManaged = existingStatus && ADMIN_MANAGED_STAGES.includes((existingStatus as { status: string }).status);

  if (!existingStatus) {
    const initialStatus =
      analyzed.opportunityScore >= QUALIFIED_SCORE_THRESHOLD
        ? "qualified_prospect"
        : analyzed.opportunityScore >= OPPORTUNITY_SCORE_THRESHOLD
          ? "opportunity"
          : "project";
    const { error: statusError } = await supabase.from("ai_prospect_status").insert({
      project_id: projectId,
      status: initialStatus,
    });
    if (statusError) return { error: statusError.message };
  } else if (!isAdminManaged) {
    // A re-discovered project not yet moved past 'project'/'opportunity'/
    // 'qualified_prospect' by a human gets its auto-assigned stage
    // refreshed to reflect the latest score — but a human's own
    // contacted/replied/negotiation/client/rejected decision is never
    // pulled backward by a re-analysis.
    const refreshedStatus =
      analyzed.opportunityScore >= QUALIFIED_SCORE_THRESHOLD
        ? "qualified_prospect"
        : analyzed.opportunityScore >= OPPORTUNITY_SCORE_THRESHOLD
          ? "opportunity"
          : "project";
    const { error: statusError } = await supabase
      .from("ai_prospect_status")
      .update({ status: refreshedStatus })
      .eq("project_id", projectId);
    if (statusError) return { error: statusError.message };
  }

  return { projectId };
}
