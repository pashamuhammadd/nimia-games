import type { createServerClient } from "@nimia/db";
import type { AgentRunParams, AgentRunSummary, AgentRunError, AnalyzedProject, DiscoveredProject } from "./types";
import { getDiscoverySource } from "./discovery/registry";
import { isDemoModeEnabled } from "./discovery/demo-provider";
import { dedupeProjectsInBatch } from "./tools/dedupe";
import { scoreProject, opportunityLevelForScore } from "./tools/scoreProject";
import { saveProject } from "./tools/save";
import { QUALIFIED_SCORE_THRESHOLD } from "./constants";

type SupabaseClient = ReturnType<typeof createServerClient>;

// The Agent — orchestrates the full pipeline the spec lays out (section
// 18):
//
//   CoinGecko discovery -> Category filtering -> Project enrichment ->
//   Deduplication -> AI analysis -> Opportunity scoring ->
//   Qualified prospects -> Save to Supabase -> Display in dashboard
//
// This function IS "the agent": given a goal (AgentRunParams), it calls
// every requested, configured discovery source, runs every discovered
// project through scoreProject, and persists the result — all inside one
// request/response cycle so it fits inside a single Vercel serverless
// invocation (spec section 22: no always-running process for V1). A run
// large enough to need more time than one invocation allows is future
// work — the same shape the retired "AI Client Hunter"'s orchestrator
// used: every tool in tools/ is a plain async function with no in-memory
// state, so the natural next step is calling the same tools from a queue
// worker instead of this function looping in-process.
//
// IMPORTANT CHANGE from the retired "AI Client Hunter": that orchestrator
// silently substituted the Demo Discovery Provider whenever no requested
// source had live credentials — meaning a misconfigured production
// deployment (COINGECKO_API_KEY unset) would silently show fake Reddit-
// flavored leads on the live dashboard, distinguished only by an
// easy-to-miss `is_demo` badge. Spec sections 4/24/25 are explicit that
// this must never happen: a run with no configured, non-demo source now
// FAILS the run with a clear "CoinGecko data unavailable" error instead.
// Demo mode is opt-in only (AI_HUNTER_DEMO_MODE=true, see
// discovery/demo-provider.ts) and is never silently substituted.

function nowIso() {
  return new Date().toISOString();
}

function analyzeProject(project: DiscoveredProject, runId: string | null): AnalyzedProject {
  const { breakdown, commercialPotential, recommendedServices, reasoning } = scoreProject(project);
  return {
    runId,
    discoverySourceId: project.discoverySourceId,
    project,
    animationOpportunity: opportunityLevelForScore(breakdown.total),
    opportunityScore: breakdown.total,
    scoreBreakdown: breakdown,
    projectFit: breakdown.total,
    commercialPotential,
    recommendedServices,
    reasoning,
  };
}

export async function runAgentPipeline(supabase: SupabaseClient, params: AgentRunParams): Promise<AgentRunSummary> {
  const errors: AgentRunError[] = [];

  // ---- Resolve which requested sources are actually usable ----
  const requestedSources = params.sourceIds.map((id) => getDiscoverySource(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const nonDemoConfigured = requestedSources.filter((s) => s.id !== "demo" && s.isConfigured());
  const demoRequested = requestedSources.some((s) => s.id === "demo");

  // A demo-only run is only ever allowed when AI_HUNTER_DEMO_MODE=true AND
  // the admin explicitly selected it — never mixed with real sources, and
  // never used automatically just because CoinGecko isn't configured.
  let activeSources = nonDemoConfigured;
  let isDemoRun = false;
  if (activeSources.length === 0) {
    if (demoRequested && isDemoModeEnabled()) {
      const demoSource = getDiscoverySource("demo");
      if (demoSource) {
        activeSources = [demoSource];
        isDemoRun = true;
      }
    }
  }

  if (activeSources.length === 0) {
    // Fail the run clearly (spec section 25) rather than silently
    // substituting anything — this is the fix for the gap described in
    // this module's own header comment.
    const { data: failedRun } = await supabase
      .from("ai_agent_runs")
      .insert({
        target_categories: params.categorySlugs,
        requested_target: params.requestedTarget,
        min_opportunity_score: params.minOpportunityScore,
        sources: params.sourceIds,
        is_demo: false,
        status: "failed",
        started_at: nowIso(),
        completed_at: nowIso(),
        errors: [
          {
            step: "discovery",
            message: "CoinGecko data unavailable — no requested discovery source is configured. Set COINGECKO_API_KEY (see apps/admin/.env.example) or, for local testing only, set AI_HUNTER_DEMO_MODE=true and select the Demo source.",
            at: nowIso(),
          },
        ],
        created_by: params.createdBy,
      })
      .select("id")
      .single();

    const runId = (failedRun as { id: string } | null)?.id ?? "unknown";
    return {
      runId,
      status: "failed",
      projectsDiscovered: 0,
      projectsAnalyzed: 0,
      qualifiedOpportunities: 0,
      rejectedProjects: 0,
      errors: [{ step: "discovery", message: "CoinGecko data unavailable — see run errors.", at: nowIso() }],
      isDemo: false,
    };
  }

  const { data: runRow, error: runInsertError } = await supabase
    .from("ai_agent_runs")
    .insert({
      target_categories: params.categorySlugs,
      requested_target: params.requestedTarget,
      min_opportunity_score: params.minOpportunityScore,
      sources: activeSources.map((s) => s.id),
      is_demo: isDemoRun,
      status: "running",
      started_at: nowIso(),
      created_by: params.createdBy,
    })
    .select("id")
    .single();

  if (runInsertError || !runRow) {
    throw new Error(runInsertError?.message ?? "Failed to create agent run.");
  }
  const runId = (runRow as { id: string }).id;

  // ---- Skip already-discovered projects (product decision, 19 Aug 2026 —
  // see types.ts's DiscoveryParams.excludeCoingeckoIds) ----
  // Every coingecko_id ever saved to ai_projects is excluded from this
  // run's discovery, permanently, not just within a freshness window: once
  // a project has been surfaced once, it's already sitting in the admin's
  // Projects list (ai_prospect_status starts at 'project' and the admin
  // can see/manage it from there) — re-showing the SAME project on a later
  // "Find Prospects" run wastes that run's limited CoinGecko detail-call
  // budget on something already known instead of spending it on something
  // genuinely new. Trade-off, stated plainly: an already-saved project's
  // market_cap/price/social-links snapshot is never refreshed by a later
  // run either, since it's never re-discovered — if Nimia ever wants
  // "refresh what I already have" as a separate action, that would need
  // its own explicit admin action (e.g. a per-project "Refresh" button
  // calling tools/save.ts directly), not a change to this exclusion list.
  // README.md flagged this as a known future improvement before 19 Aug
  // 2026 (originally shipped as a 24h rolling cache, then widened to
  // permanent the same day per explicit product direction). Best-effort
  // only — a failed lookup here just means this run doesn't get the
  // exclusion, never a reason to fail the whole run. Capped at 20,000 rows
  // (Supabase/PostgREST's own default cap is 1,000) — revisit if
  // ai_projects ever actually grows past that before this cap does.
  let excludeCoingeckoIds: string[] = [];
  try {
    const { data: knownRows } = await supabase.from("ai_projects").select("coingecko_id").limit(20_000);
    excludeCoingeckoIds = (knownRows as { coingecko_id: string }[] | null)?.map((r) => r.coingecko_id) ?? [];
  } catch {
    // See comment above — swallow and proceed without the exclusion list.
  }

  // ---- Discovery ----
  const perSourceLimit = Math.max(params.requestedTarget, 10);
  const allProjects: DiscoveredProject[] = [];

  for (const source of activeSources) {
    try {
      const discovered = await source.discover({ categorySlugs: params.categorySlugs, limit: perSourceLimit, excludeCoingeckoIds });
      allProjects.push(...discovered);
    } catch (error) {
      errors.push({
        step: `discovery:${source.id}`,
        message: error instanceof Error ? error.message : "Discovery source failed.",
        at: nowIso(),
      });
    }
  }

  const projectsDiscovered = allProjects.length;

  // ---- Deduplication ----
  const deduped = dedupeProjectsInBatch(allProjects).slice(0, params.requestedTarget);

  // ---- AI Analysis + Opportunity Scoring + Save ----
  let projectsAnalyzed = 0;
  let qualifiedOpportunities = 0;
  let rejectedProjects = 0;

  for (const project of deduped) {
    try {
      const analyzed = analyzeProject(project, runId);
      const result = await saveProject(supabase, analyzed);
      projectsAnalyzed += 1;

      if (analyzed.opportunityScore >= (params.minOpportunityScore || QUALIFIED_SCORE_THRESHOLD)) {
        qualifiedOpportunities += 1;
      } else if (analyzed.animationOpportunity === "none" || analyzed.animationOpportunity === "low") {
        rejectedProjects += 1;
      }

      if ("error" in result) {
        errors.push({ step: "save_project", message: result.error, at: nowIso() });
      }
    } catch (error) {
      errors.push({
        step: "analyze_project",
        message: error instanceof Error ? error.message : "Failed to analyze a project.",
        at: nowIso(),
      });
    }
  }

  const status = "completed" as const;
  const { error: updateError } = await supabase
    .from("ai_agent_runs")
    .update({
      status,
      completed_at: nowIso(),
      projects_discovered: projectsDiscovered,
      projects_analyzed: projectsAnalyzed,
      qualified_opportunities: qualifiedOpportunities,
      rejected_projects: rejectedProjects,
      errors,
    })
    .eq("id", runId);

  if (updateError) {
    errors.push({ step: "finalize_run", message: updateError.message, at: nowIso() });
  }

  return {
    runId,
    status,
    projectsDiscovered,
    projectsAnalyzed,
    qualifiedOpportunities,
    rejectedProjects,
    errors,
    isDemo: isDemoRun,
  };
}
