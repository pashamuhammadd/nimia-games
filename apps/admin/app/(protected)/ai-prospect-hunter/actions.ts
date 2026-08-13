"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { runAgentPipeline } from "../../../lib/ai-agent/orchestrator";
import { generateOutreachDraft } from "../../../lib/ai-agent/outreach";
import { listDiscoverySourceStatuses } from "../../../lib/ai-agent/discovery/registry";
import type { AiProspectStatus, AiOutreachStatus } from "../../../lib/ai-agent/types";
import { DEFAULT_MIN_OPPORTUNITY_SCORE, DEFAULT_REQUESTED_TARGET } from "../../../lib/ai-agent/constants";

// Every write below relies on RLS as the real enforcement boundary
// (ai_agent_runs_admin_all / ai_projects_admin_all / etc.,
// packages/db/migrations/0040_ai_prospect_hunter.sql, all gate on
// public.is_admin()) — this file is convenience/UX, not the security
// boundary itself.
//
// IMPORTANT (spec section 19): nothing in this file EVER sets
// outreach_status away from 'not_contacted' except an explicit admin
// action the UI only exposes as a deliberate button click
// ("Mark as Contacted") — never automatically, never as a side effect of
// discovery or scoring. The AI never sends outreach itself.

export type HunterActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

const HUNTER_PATHS = [
  "/ai-prospect-hunter",
  "/ai-prospect-hunter/projects",
  "/ai-prospect-hunter/find",
  "/ai-prospect-hunter/outreach",
  "/ai-prospect-hunter/runs",
];

function revalidateHunter() {
  for (const path of HUNTER_PATHS) revalidatePath(path);
}

export type StartAgentRunInput = {
  categorySlugs: string[];
  requestedTarget?: number;
  minOpportunityScore?: number;
  sourceIds: string[];
};

export async function startAgentRunAction(input: StartAgentRunInput): Promise<HunterActionResult<{ runId: string }>> {
  if (!input.sourceIds || input.sourceIds.length === 0) {
    return { success: false, error: "Select at least one discovery source." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const summary = await runAgentPipeline(supabase, {
      categorySlugs: input.categorySlugs ?? [],
      requestedTarget: input.requestedTarget && input.requestedTarget > 0 ? input.requestedTarget : DEFAULT_REQUESTED_TARGET,
      minOpportunityScore: input.minOpportunityScore ?? DEFAULT_MIN_OPPORTUNITY_SCORE,
      sourceIds: input.sourceIds,
      createdBy: user?.id ?? null,
    });

    revalidateHunter();
    revalidatePath("/ai-prospect-hunter/settings");

    if (summary.status === "failed") {
      return { success: false, error: summary.errors[0]?.message ?? "The Prospect Hunter run failed to start." };
    }

    return { success: true, data: { runId: summary.runId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The Prospect Hunter run failed to start." };
  }
}

export async function setProspectStatusAction(projectId: string, status: AiProspectStatus): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("ai_prospect_status").update({ status }).eq("project_id", projectId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export async function setOutreachStatusAction(projectId: string, status: AiOutreachStatus): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("ai_prospect_status").update({ outreach_status: status }).eq("project_id", projectId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

// "Mark as Contacted" (spec section 19) — the ONE place a project's
// outreach_status can move off 'not_contacted'/'ready', and it only ever
// runs from an explicit admin button click. Also advances `status`, but
// only from 'project'/'opportunity'/'qualified_prospect' — never
// overrides a stage the admin already moved further along.
export async function markProjectContactedAction(projectId: string): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());

  const { data: row, error: fetchError } = await supabase
    .from("ai_prospect_status")
    .select("status")
    .eq("project_id", projectId)
    .single();
  if (fetchError || !row) {
    return { success: false, error: fetchError?.message ?? "Project status not found." };
  }

  const currentStatus = (row as { status: string }).status;
  const update: Record<string, unknown> = { outreach_status: "contacted" };
  if (["project", "opportunity", "qualified_prospect"].includes(currentStatus)) {
    update.status = "contacted";
  }

  const { error } = await supabase.from("ai_prospect_status").update(update).eq("project_id", projectId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export type GenerateOutreachResult = { outreachId: string; message: string; aiAssisted: boolean; note?: string };

export async function generateOutreachAction(projectId: string): Promise<HunterActionResult<GenerateOutreachResult>> {
  const supabase = createServerClient(await cookies());

  const { data: project, error: fetchError } = await supabase
    .from("ai_projects")
    .select("name, symbol, categories, social_links")
    .eq("id", projectId)
    .single();
  if (fetchError || !project) {
    return { success: false, error: fetchError?.message ?? "Project not found." };
  }

  const { data: analysis } = await supabase
    .from("ai_project_analysis")
    .select("recommended_services, reasoning")
    .eq("project_id", projectId)
    .maybeSingle();

  const row = project as { name: string; symbol: string | null; categories: string[]; social_links: { twitter?: string | null } | null };
  const analysisRow = analysis as { recommended_services: string[] | null; reasoning: string | null } | null;

  const draft = await generateOutreachDraft({
    name: row.name,
    symbol: row.symbol,
    category: row.categories?.[0] ?? null,
    recommendedServices: analysisRow?.recommended_services ?? [],
    reasoning: analysisRow?.reasoning ?? "",
    twitterUrl: row.social_links?.twitter ?? null,
  });

  const { data: saved, error: insertError } = await supabase
    .from("ai_outreach")
    .insert({ project_id: projectId, message: draft.message, generated_by_ai: draft.aiAssisted })
    .select("id")
    .single();

  if (insertError || !saved) {
    return { success: false, error: insertError?.message ?? "Failed to save the generated draft." };
  }

  // A generated draft signals the project is worth reaching out to — bump
  // outreach_status to 'ready' (still NOT 'contacted') so the Outreach
  // Queue can distinguish "draft ready to review" from "nothing prepared
  // yet".
  await supabase
    .from("ai_prospect_status")
    .update({ outreach_status: "ready" })
    .eq("project_id", projectId)
    .eq("outreach_status", "not_contacted");

  revalidateHunter();
  return {
    success: true,
    data: { outreachId: (saved as { id: string }).id, message: draft.message, aiAssisted: draft.aiAssisted, note: draft.note },
  };
}

export async function saveOutreachEditAction(outreachId: string, message: string): Promise<HunterActionResult> {
  const trimmed = message.trim();
  if (!trimmed) return { success: false, error: "The message can't be empty." };

  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("ai_outreach").update({ message: trimmed, is_edited: true }).eq("id", outreachId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export async function approveOutreachAction(outreachId: string): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Your session has expired, please log in again." };

  const { error } = await supabase
    .from("ai_outreach")
    .update({ approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", outreachId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export async function getDiscoverySourceStatusesAction() {
  return listDiscoverySourceStatuses();
}
