import type { createServerClient } from "@nimia/db";
import type { AgentRunParams, AgentRunSummary, AgentRunError, AnalyzedLead, AiQualificationStatus, Candidate } from "./types";
import { getDiscoverySource } from "./discovery/registry";
import { dedupeCandidatesInBatch, buildDedupeKey } from "./tools/dedupe";
import { extractProjectInformation } from "./tools/extract";
import { classifyBuyingIntent } from "./tools/qualify";
import { scoreLead, buildEvidence } from "./tools/score";
import { scoreFirmographicLead, buildFirmographicEvidence, firmographicBuyingIntent, TYPICAL_SERVICES } from "./tools/scoreFirmographic";
import { saveLead } from "./tools/save";
import { truncate } from "./tools/text";
import { QUALIFIED_SCORE_THRESHOLD, POSSIBLE_SCORE_THRESHOLD } from "./constants";

type SupabaseClient = ReturnType<typeof createServerClient>;

// The Agent — orchestrates the full pipeline the brief lays out:
//
//   Goal -> Discovery -> Candidate Collection -> Deduplication ->
//   Filtering -> AI Analysis -> Lead Scoring -> Qualification ->
//   Database -> Dashboard
//
// This function IS "the agent": given a goal (AgentRunParams), it decides
// which configured discovery tools to call, runs every candidate through
// the analysis/scoring/qualification tools in tools/, and persists the
// result — all inside one request/response cycle so it fits inside a
// single Vercel serverless function invocation (brief section 19: no
// always-running process for V1). A run large enough to need more time
// than one invocation allows is future work — see this module's own
// README for how to move this same function behind a queue/background
// worker without changing tools/ at all.
function nowIso() {
  return new Date().toISOString();
}

function decideQualificationStatus(totalScore: number, isLikelyNotAProspect: boolean): AiQualificationStatus {
  if (isLikelyNotAProspect) return "rejected";
  if (totalScore >= QUALIFIED_SCORE_THRESHOLD) return "qualified";
  if (totalScore >= POSSIBLE_SCORE_THRESHOLD) return "possible";
  return "rejected";
}

function analyzeCandidate(candidate: Candidate, runId: string | null): AnalyzedLead {
  const signal = classifyBuyingIntent(candidate.text);
  const extracted = extractProjectInformation(candidate);
  const { breakdown, serviceMatches } = scoreLead(candidate, signal, extracted);
  const evidence = buildEvidence(candidate, signal, serviceMatches);

  // "If there is insufficient evidence... lower the lead score" (brief
  // section 8) — applied here, after scoring, so the penalty is visible
  // and explainable rather than silently baked into one factor.
  let total = breakdown.total;
  const reasonParts: string[] = [];

  if (signal.isLikelyNotAProspect) {
    reasonParts.push(`Does not appear to be a genuine buying inquiry — ${signal.intentReasons[0] ?? "no hiring language detected"}.`);
  } else {
    reasonParts.push(signal.intentReasons[0] ?? "No strong buying-intent signal detected.");
    if (breakdown.serviceFit.reasons[0]) reasonParts.push(breakdown.serviceFit.reasons[0]);
  }

  if (evidence.length === 0) {
    total = Math.max(0, total - 10);
    reasonParts.push("Insufficient evidence.");
  }

  const status = decideQualificationStatus(total, signal.isLikelyNotAProspect);
  const topMatch = serviceMatches[0] ?? null;

  const projectDescription = candidate.title
    ? `${candidate.title} — ${truncate(candidate.text, 260)}`
    : truncate(candidate.text, 280);

  return {
    runId,
    projectName: candidate.prospectName ?? candidate.title ?? null,
    prospectName: candidate.prospectName ?? null,
    username: candidate.username ?? null,
    platform: candidate.platform,
    sourceUrl: candidate.sourceUrl,
    projectUrl: candidate.projectUrl ?? null,
    detectedService: topMatch ? (topMatch.category.catalogServiceName ?? topMatch.category.label) : null,
    animationType: topMatch ? topMatch.category.label : null,
    projectDescription,
    detectedNeed: topMatch ? `${topMatch.category.label} for ${candidate.prospectName ?? "their project"}` : null,
    buyingIntent: signal.buyingIntent,
    budgetInformation: extracted.budgetInformation,
    deadlineInformation: extracted.deadlineInformation,
    leadScore: total,
    scoreBreakdown: { ...breakdown, total },
    qualificationStatus: status,
    qualificationReason: reasonParts.join(" "),
    evidence,
    contactMethod: extracted.contactMethod,
    contactUrl: extracted.contactUrl,
    isDemo: candidate.isDemo,
    dedupeKey: buildDedupeKey(candidate),
    discoverySourceId: candidate.discoverySourceId,
    rawSnippet: truncate(candidate.text, 500),
  };
}

// Firmographic sibling of analyzeCandidate() above — routes any candidate
// carrying a `firmographic` signal (CoinGecko's memecoin/NFT providers)
// through tools/scoreFirmographic.ts instead of tools/qualify.ts +
// tools/score.ts. See that module's header comment for why the two paths
// must stay separate rather than one branching inside the other: an
// inferred "this project's profile suggests it's a prospect" signal must
// never be presented — in code or in the UI's qualification_reason — as
// an expressed "this person asked to hire an animator" one.
function analyzeFirmographicCandidate(candidate: Candidate, runId: string | null): AnalyzedLead {
  const signal = candidate.firmographic!;
  const { breakdown } = scoreFirmographicLead(candidate, signal);
  const evidence = buildFirmographicEvidence(candidate, signal);
  const services = TYPICAL_SERVICES[signal.projectType];
  const topService = services[0];

  const status = decideQualificationStatus(breakdown.total, false);

  const reasonParts: string[] = [
    "No explicit request for animation was found for this prospect — qualification is based on the project's " +
      "public profile (category, channels, activity), not a stated need. Review manually before any outreach.",
  ];
  if (breakdown.serviceFit.reasons[0]) reasonParts.push(breakdown.serviceFit.reasons[0]);

  const projectDescription = candidate.title
    ? `${candidate.title} — ${truncate(candidate.text, 260)}`
    : truncate(candidate.text, 280);

  return {
    runId,
    projectName: candidate.prospectName ?? candidate.title ?? null,
    prospectName: candidate.prospectName ?? null,
    username: candidate.username ?? null,
    platform: candidate.platform,
    sourceUrl: candidate.sourceUrl,
    projectUrl: candidate.projectUrl ?? null,
    detectedService: topService.catalogServiceName ?? topService.label,
    animationType: topService.label,
    projectDescription,
    detectedNeed: `Likely needs ${services.map((s) => s.label).join("/")} based on project profile (inferred, not confirmed).`,
    buyingIntent: firmographicBuyingIntent(breakdown.buyingIntent.score, breakdown.buyingIntent.max),
    budgetInformation: signal.marketCapUsd != null ? `Market cap ~$${Math.round(signal.marketCapUsd).toLocaleString()} (CoinGecko)` : null,
    deadlineInformation: null,
    leadScore: breakdown.total,
    scoreBreakdown: breakdown,
    qualificationStatus: status,
    qualificationReason: reasonParts.join(" "),
    evidence,
    contactMethod: candidate.contactMethod ?? null,
    contactUrl: candidate.contactUrl ?? null,
    isDemo: candidate.isDemo,
    dedupeKey: buildDedupeKey(candidate),
    discoverySourceId: candidate.discoverySourceId,
    rawSnippet: truncate(candidate.text, 500),
  };
}

export async function runAgentPipeline(supabase: SupabaseClient, params: AgentRunParams): Promise<AgentRunSummary> {
  const errors: AgentRunError[] = [];

  const { data: runRow, error: runInsertError } = await supabase
    .from("ai_agent_runs")
    .insert({
      target: params.target,
      service_filter: params.serviceFilter ?? null,
      audience_filter: params.audienceFilter ?? null,
      requested_leads: params.requestedLeads,
      min_lead_score: params.minLeadScore,
      sources: params.sourceIds,
      status: "running",
      started_at: nowIso(),
      created_by: params.createdBy,
      is_demo: true,
    })
    .select("id")
    .single();

  if (runInsertError || !runRow) {
    throw new Error(runInsertError?.message ?? "Failed to create agent run.");
  }
  const runId = (runRow as { id: string }).id;

  // ---- Discovery ----
  let activeSourceIds = params.sourceIds
    .map((id) => getDiscoverySource(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s) && s!.isConfigured())
    .map((s) => s!.id);

  if (activeSourceIds.length === 0) {
    errors.push({
      step: "discovery",
      message: "None of the requested sources are configured with live credentials — falling back to the Demo Discovery Provider.",
      at: nowIso(),
    });
    activeSourceIds = ["demo"];
  }

  const perSourceLimit = Math.max(params.requestedLeads, 10);
  const allCandidates: Candidate[] = [];

  for (const sourceId of activeSourceIds) {
    const source = getDiscoverySource(sourceId);
    if (!source) continue;
    try {
      const candidates = await source.discover({
        target: params.target,
        serviceFilter: params.serviceFilter,
        audienceFilter: params.audienceFilter,
        limit: perSourceLimit,
      });
      allCandidates.push(...candidates);
    } catch (error) {
      errors.push({
        step: `discovery:${sourceId}`,
        message: error instanceof Error ? error.message : "Discovery source failed.",
        at: nowIso(),
      });
    }
  }

  const isDemoRun = activeSourceIds.every((id) => id === "demo");
  const candidatesFound = allCandidates.length;

  // ---- Deduplication + filtering ----
  const deduped = dedupeCandidatesInBatch(allCandidates);
  const filtered = deduped.filter((c) => c.text && c.text.trim().length >= 20);

  // ---- AI Analysis + Lead Scoring + Qualification + Database ----
  let candidatesAnalyzed = 0;
  let qualifiedLeads = 0;
  let rejectedLeads = 0;

  for (const candidate of filtered) {
    try {
      const analyzed = candidate.firmographic ? analyzeFirmographicCandidate(candidate, runId) : analyzeCandidate(candidate, runId);
      const result = await saveLead(supabase, analyzed);
      candidatesAnalyzed += 1;

      if (analyzed.qualificationStatus === "qualified" || analyzed.qualificationStatus === "possible") {
        qualifiedLeads += 1;
      } else if (analyzed.qualificationStatus === "rejected") {
        rejectedLeads += 1;
      }

      if ("error" in result) {
        errors.push({ step: "save_lead", message: result.error, at: nowIso() });
      }
    } catch (error) {
      errors.push({
        step: "analyze_lead",
        message: error instanceof Error ? error.message : "Failed to analyze a candidate.",
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
      candidates_found: candidatesFound,
      candidates_analyzed: candidatesAnalyzed,
      qualified_leads: qualifiedLeads,
      rejected_leads: rejectedLeads,
      errors,
      is_demo: isDemoRun,
    })
    .eq("id", runId);

  if (updateError) {
    errors.push({ step: "finalize_run", message: updateError.message, at: nowIso() });
  }

  return {
    runId,
    status,
    candidatesFound,
    candidatesAnalyzed,
    qualifiedLeads,
    rejectedLeads,
    errors,
    isDemo: isDemoRun,
  };
}
