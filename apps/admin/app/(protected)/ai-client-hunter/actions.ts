"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { runAgentPipeline } from "../../../lib/ai-agent/orchestrator";
import { generateOutreachDraft } from "../../../lib/ai-agent/outreach";
import { listDiscoverySourceStatuses } from "../../../lib/ai-agent/discovery/registry";
import type { AiQualificationStatus, AiOutreachStatus } from "../../../lib/ai-agent/types";
import { DEFAULT_MIN_LEAD_SCORE, DEFAULT_REQUESTED_LEADS } from "../../../lib/ai-agent/constants";

// Every write below relies on RLS as the real enforcement boundary
// (ai_agent_runs_admin_all / ai_leads_admin_all / ai_outreach_admin_all,
// packages/db/migrations/0039_ai_client_hunter.sql, all gate on
// public.is_admin()) — this file is convenience/UX, not the security
// boundary itself, same convention as every other actions.ts in this app.
//
// IMPORTANT (brief section 7/16/18): nothing in this file EVER sets
// outreach_status away from 'not_contacted' except an explicit admin
// action the UI only exposes as a deliberate button click
// ("Mark as Contacted") — never automatically, never as a side effect of
// discovery or scoring.

export type HunterActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

const HUNTER_PATHS = ["/ai-client-hunter", "/ai-client-hunter/leads", "/ai-client-hunter/find", "/ai-client-hunter/outreach"];

function revalidateHunter() {
  for (const path of HUNTER_PATHS) revalidatePath(path);
}

export type StartAgentRunInput = {
  target: string;
  serviceFilter?: string;
  audienceFilter?: string;
  requestedLeads?: number;
  minLeadScore?: number;
  sourceIds: string[];
};

export async function startAgentRunAction(input: StartAgentRunInput): Promise<HunterActionResult<{ runId: string }>> {
  const target = input.target.trim();
  if (!target) {
    return { success: false, error: "Describe what kind of clients to look for (e.g. \"Web3 game trailer\")." };
  }
  if (!input.sourceIds || input.sourceIds.length === 0) {
    return { success: false, error: "Select at least one discovery source." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const summary = await runAgentPipeline(supabase, {
      target,
      serviceFilter: input.serviceFilter?.trim() || null,
      audienceFilter: input.audienceFilter?.trim() || null,
      requestedLeads: input.requestedLeads && input.requestedLeads > 0 ? input.requestedLeads : DEFAULT_REQUESTED_LEADS,
      minLeadScore: input.minLeadScore ?? DEFAULT_MIN_LEAD_SCORE,
      sourceIds: input.sourceIds,
      createdBy: user?.id ?? null,
    });

    revalidateHunter();
    revalidatePath("/ai-client-hunter/settings");
    return { success: true, data: { runId: summary.runId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The AI Hunter run failed to start." };
  }
}

export async function setLeadQualificationStatusAction(
  leadId: string,
  status: AiQualificationStatus,
): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("ai_leads").update({ qualification_status: status }).eq("id", leadId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export async function setLeadOutreachStatusAction(
  leadId: string,
  status: AiOutreachStatus,
): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("ai_leads").update({ outreach_status: status }).eq("id", leadId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

// "Mark as Contacted" (brief section 16/7) — the ONE place a lead's
// outreach_status can move off 'not_contacted'/'ready', and it only ever
// runs from an explicit admin button click. Also advances
// qualification_status to 'contacted', but only from 'qualified' or
// 'possible' — never overrides a status the admin already moved further
// along (e.g. 'negotiation').
export async function markLeadContactedAction(leadId: string): Promise<HunterActionResult> {
  const supabase = createServerClient(await cookies());

  const { data: lead, error: fetchError } = await supabase
    .from("ai_leads")
    .select("qualification_status")
    .eq("id", leadId)
    .single();
  if (fetchError || !lead) {
    return { success: false, error: fetchError?.message ?? "Lead not found." };
  }

  const currentStatus = (lead as { qualification_status: string }).qualification_status;
  const update: Record<string, unknown> = { outreach_status: "contacted" };
  if (currentStatus === "qualified" || currentStatus === "possible" || currentStatus === "new") {
    update.qualification_status = "contacted";
  }

  const { error } = await supabase.from("ai_leads").update(update).eq("id", leadId);
  if (error) return { success: false, error: error.message };
  revalidateHunter();
  return { success: true, data: undefined };
}

export type GenerateOutreachResult = { outreachId: string; message: string; aiAssisted: boolean; note?: string };

export async function generateOutreachAction(leadId: string): Promise<HunterActionResult<GenerateOutreachResult>> {
  const supabase = createServerClient(await cookies());

  const { data: lead, error: fetchError } = await supabase
    .from("ai_leads")
    .select("prospect_name, project_name, username, platform, detected_service, animation_type, detected_need, evidence")
    .eq("id", leadId)
    .single();
  if (fetchError || !lead) {
    return { success: false, error: fetchError?.message ?? "Lead not found." };
  }

  const row = lead as {
    prospect_name: string | null;
    project_name: string | null;
    username: string | null;
    platform: string;
    detected_service: string | null;
    animation_type: string | null;
    detected_need: string | null;
    evidence: { quote: string; sourceUrl: string | null }[] | null;
  };

  const draft = await generateOutreachDraft({
    prospectName: row.prospect_name,
    projectName: row.project_name,
    username: row.username,
    platform: row.platform,
    detectedService: row.detected_service,
    animationType: row.animation_type,
    detectedNeed: row.detected_need,
    evidence: row.evidence ?? [],
  });

  const { data: saved, error: insertError } = await supabase
    .from("ai_outreach")
    .insert({ lead_id: leadId, message: draft.message, generated_by_ai: draft.aiAssisted })
    .select("id")
    .single();

  if (insertError || !saved) {
    return { success: false, error: insertError?.message ?? "Failed to save the generated draft." };
  }

  // A generated draft signals the lead is worth reaching out to — bump
  // outreach_status to 'ready' (still NOT 'contacted') so the Outreach
  // Queue can distinguish "draft ready to review" from "nothing prepared
  // yet", without this ever counting as contact having happened.
  await supabase.from("ai_leads").update({ outreach_status: "ready" }).eq("id", leadId).eq("outreach_status", "not_contacted");

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
