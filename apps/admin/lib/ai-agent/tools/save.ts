import type { createServerClient } from "@nimia/db";
import type { AnalyzedLead } from "../types";

type SupabaseClient = ReturnType<typeof createServerClient>;

// Tool: save_lead — the ONLY place in this module that writes to
// `ai_leads`/`ai_lead_sources`. Upserts on the unique `dedupe_key` index
// (packages/db/migrations/0039) so re-discovering the same prospect on a
// later run refreshes the existing row rather than duplicating it —
// `discovered_at` is deliberately excluded from the update set so it
// keeps pointing at the FIRST time this prospect was ever found, while
// every other analyzed field (score, evidence, qualification, etc.)
// reflects the latest run.
//
// Never touches `outreach_status` or moves `qualification_status` into
// any of the admin-only stages ('contacted'/'replied'/'negotiation'/
// 'converted'/'lost') — those only ever change from a human action in
// apps/admin/app/(protected)/ai-client-hunter/actions.ts. A duplicate
// re-discovery of an already 'contacted' lead still gets its score/
// evidence refreshed here, but its outreach progress is left alone.
export async function saveLead(
  supabase: SupabaseClient,
  analyzed: AnalyzedLead,
): Promise<{ leadId: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("ai_leads")
    .select("id, qualification_status")
    .eq("dedupe_key", analyzed.dedupeKey)
    .maybeSingle();

  const isAdminManagedStage =
    existing &&
    ["contacted", "replied", "negotiation", "converted", "lost"].includes(
      (existing as { qualification_status: string }).qualification_status,
    );

  const row: Record<string, unknown> = {
    run_id: analyzed.runId,
    project_name: analyzed.projectName,
    prospect_name: analyzed.prospectName,
    username: analyzed.username,
    platform: analyzed.platform,
    source_url: analyzed.sourceUrl,
    project_url: analyzed.projectUrl,
    detected_service: analyzed.detectedService,
    animation_type: analyzed.animationType,
    project_description: analyzed.projectDescription,
    detected_need: analyzed.detectedNeed,
    buying_intent: analyzed.buyingIntent,
    budget_information: analyzed.budgetInformation,
    deadline_information: analyzed.deadlineInformation,
    lead_score: analyzed.leadScore,
    score_breakdown: analyzed.scoreBreakdown,
    qualification_reason: analyzed.qualificationReason,
    evidence: analyzed.evidence,
    contact_method: analyzed.contactMethod,
    contact_url: analyzed.contactUrl,
    is_demo: analyzed.isDemo,
    dedupe_key: analyzed.dedupeKey,
  };

  // A lead a human has already moved past 'qualified'/'possible'/
  // 'rejected' keeps its status — the AI re-scoring it on a later run
  // must not silently pull it back to 'new' or override a decision a
  // person already made.
  if (!isAdminManagedStage) {
    row.qualification_status = analyzed.qualificationStatus;
  }

  const { data: saved, error } = await supabase
    .from("ai_leads")
    .upsert(row, { onConflict: "dedupe_key" })
    .select("id")
    .single();

  if (error || !saved) {
    return { error: error?.message ?? "Failed to save lead." };
  }

  const leadId = (saved as { id: string }).id;

  const { error: sourceError } = await supabase.from("ai_lead_sources").insert({
    lead_id: leadId,
    discovery_source: analyzed.discoverySourceId,
    source_url: analyzed.sourceUrl,
    raw_snippet: analyzed.rawSnippet,
  });
  if (sourceError) {
    // Non-fatal — the lead itself saved fine, only its evidence trail
    // entry failed. Surfaced to the run's error log by the orchestrator,
    // not thrown, so one bad insert doesn't fail the whole run.
    return { leadId };
  }

  return { leadId };
}
