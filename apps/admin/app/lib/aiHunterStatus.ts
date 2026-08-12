// Status metadata for the AI Client Hunter's two independent status
// tracks — same "one source of truth for label + color" convention as
// apps/admin/app/lib/orderStatus.ts. Keep in sync with the enum values
// created in packages/db/migrations/0039_ai_client_hunter.sql
// (public.ai_qualification_status / public.ai_outreach_status).
//
// Two SEPARATE tracks, not one — a lead's `qualification_status` is the
// AI's/pipeline's read on the prospect (and later, the admin's own
// pipeline-stage decisions: Negotiation/Converted/Lost), while
// `outreach_status` tracks the mechanics of actually reaching out
// (brief section 7 lists both as distinct fields). A lead can be
// "Qualified" with outreach still "Not Contacted", or "Contacted" with
// qualification still sitting at "Qualified" until it moves further.

export type AiQualificationStatus =
  | "new"
  | "qualified"
  | "possible"
  | "rejected"
  | "contacted"
  | "replied"
  | "negotiation"
  | "converted"
  | "lost";

export const AI_QUALIFICATION_STATUS_META: Record<AiQualificationStatus, { label: string; dotClass: string }> = {
  new: { label: "New", dotClass: "bg-slate-400" },
  qualified: { label: "Qualified", dotClass: "bg-emerald-400" },
  possible: { label: "Possible", dotClass: "bg-amber-400" },
  rejected: { label: "Rejected", dotClass: "bg-red-400" },
  contacted: { label: "Contacted", dotClass: "bg-sky-400" },
  replied: { label: "Replied", dotClass: "bg-purple-400" },
  negotiation: { label: "Negotiation", dotClass: "bg-purple-500" },
  converted: { label: "Converted", dotClass: "bg-emerald-500" },
  lost: { label: "Lost", dotClass: "bg-white/30" },
};

export function aiQualificationStatusMeta(status: string) {
  return AI_QUALIFICATION_STATUS_META[status as AiQualificationStatus] ?? { label: status, dotClass: "bg-slate-400" };
}

export const AI_QUALIFICATION_STATUS_FILTERS: { value: AiQualificationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "possible", label: "Possible" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "negotiation", label: "Negotiation" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
  { value: "lost", label: "Lost" },
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

export function leadScoreTone(score: number): { label: string; textClass: string; ringClass: string } {
  if (score >= 80) return { label: "Hot", textClass: "text-emerald-300", ringClass: "ring-emerald-400/40" };
  if (score >= 70) return { label: "Qualified", textClass: "text-sky-300", ringClass: "ring-sky-400/40" };
  if (score >= 40) return { label: "Possible", textClass: "text-amber-300", ringClass: "ring-amber-400/40" };
  return { label: "Low", textClass: "text-white/45", ringClass: "ring-white/15" };
}
