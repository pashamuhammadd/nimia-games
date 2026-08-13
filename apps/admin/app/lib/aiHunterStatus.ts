// Status metadata for the AI Prospect Hunter's independent status tracks
// — same "one source of truth for label + color" convention as
// apps/admin/app/lib/orderStatus.ts. Keep in sync with the enum values
// created in packages/db/migrations/0040_ai_prospect_hunter.sql
// (public.ai_prospect_status / public.ai_outreach_status /
// public.ai_opportunity_level).
//
// Two SEPARATE tracks, same reasoning the retired "AI Client Hunter" had:
// `status` is the pipeline stage (Project -> Opportunity -> Qualified
// Prospect -> ... -> Client, spec section 13), while `outreach_status`
// tracks the mechanics of actually reaching out. A project can be a
// "Qualified Prospect" with outreach still "Not Contacted".

export type AiProspectStatus =
  | "project"
  | "opportunity"
  | "qualified_prospect"
  | "contacted"
  | "replied"
  | "negotiation"
  | "client"
  | "rejected";

export const AI_PROSPECT_STATUS_META: Record<AiProspectStatus, { label: string; dotClass: string }> = {
  project: { label: "Project", dotClass: "bg-slate-400" },
  opportunity: { label: "Opportunity", dotClass: "bg-amber-400" },
  qualified_prospect: { label: "Qualified Prospect", dotClass: "bg-emerald-400" },
  contacted: { label: "Contacted", dotClass: "bg-sky-400" },
  replied: { label: "Replied", dotClass: "bg-purple-400" },
  negotiation: { label: "Negotiation", dotClass: "bg-purple-500" },
  client: { label: "Client", dotClass: "bg-emerald-500" },
  rejected: { label: "Rejected", dotClass: "bg-red-400" },
};

export function aiProspectStatusMeta(status: string) {
  return AI_PROSPECT_STATUS_META[status as AiProspectStatus] ?? { label: status, dotClass: "bg-slate-400" };
}

export const AI_PROSPECT_STATUS_FILTERS: { value: AiProspectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "project", label: "Project" },
  { value: "opportunity", label: "Opportunity" },
  { value: "qualified_prospect", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "negotiation", label: "Negotiation" },
  { value: "client", label: "Client" },
  { value: "rejected", label: "Rejected" },
];

export type AiOutreachStatus =
  | "not_contacted"
  | "ready"
  | "contacted"
  | "replied"
  | "no_response"
  | "interested"
  | "not_interested";

export const AI_OUTREACH_STATUS_META: Record<AiOutreachStatus, { label: string; dotClass: string }> = {
  not_contacted: { label: "Not Contacted", dotClass: "bg-slate-400" },
  ready: { label: "Ready", dotClass: "bg-amber-400" },
  contacted: { label: "Contacted", dotClass: "bg-sky-400" },
  replied: { label: "Replied", dotClass: "bg-purple-400" },
  no_response: { label: "No Response", dotClass: "bg-white/30" },
  interested: { label: "Interested", dotClass: "bg-emerald-400" },
  not_interested: { label: "Not Interested", dotClass: "bg-red-400" },
};

export function aiOutreachStatusMeta(status: string) {
  return AI_OUTREACH_STATUS_META[status as AiOutreachStatus] ?? { label: status, dotClass: "bg-slate-400" };
}

export type AiOpportunityLevel = "very_high" | "high" | "medium" | "low" | "none";

export const AI_OPPORTUNITY_LEVEL_META: Record<AiOpportunityLevel, { label: string; textClass: string; ringClass: string }> = {
  very_high: { label: "Very High", textClass: "text-emerald-300", ringClass: "ring-emerald-400/40" },
  high: { label: "High", textClass: "text-sky-300", ringClass: "ring-sky-400/40" },
  medium: { label: "Medium", textClass: "text-amber-300", ringClass: "ring-amber-400/40" },
  low: { label: "Low", textClass: "text-white/55", ringClass: "ring-white/15" },
  none: { label: "None", textClass: "text-white/35", ringClass: "ring-white/10" },
};

export function opportunityLevelMeta(level: string) {
  return AI_OPPORTUNITY_LEVEL_META[level as AiOpportunityLevel] ?? AI_OPPORTUNITY_LEVEL_META.none;
}

export function opportunityScoreTone(score: number): { label: string; textClass: string; ringClass: string } {
  if (score >= 80) return { label: "Very High", textClass: "text-emerald-300", ringClass: "ring-emerald-400/40" };
  if (score >= 60) return { label: "High", textClass: "text-sky-300", ringClass: "ring-sky-400/40" };
  if (score >= 40) return { label: "Medium", textClass: "text-amber-300", ringClass: "ring-amber-400/40" };
  if (score >= 20) return { label: "Low", textClass: "text-white/55", ringClass: "ring-white/15" };
  return { label: "None", textClass: "text-white/35", ringClass: "ring-white/10" };
}
