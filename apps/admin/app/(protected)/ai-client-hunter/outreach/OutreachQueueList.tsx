"use client";

import * as React from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Textarea } from "@nimia/ui";
import { leadScoreTone, aiQualificationStatusMeta, aiOutreachStatusMeta } from "../../../lib/aiHunterStatus";
import { saveOutreachEditAction, approveOutreachAction, markLeadContactedAction } from "../actions";

type LeadSummary = {
  id: string;
  project_name: string | null;
  prospect_name: string | null;
  username: string | null;
  platform: string;
  lead_score: number;
  qualification_status: string;
  outreach_status: string;
  source_url: string | null;
  contact_url: string | null;
  contact_method: string | null;
};

export type OutreachRow = {
  id: string;
  lead_id: string;
  message: string;
  is_edited: boolean;
  generated_by_ai: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  ai_leads: LeadSummary | LeadSummary[] | null;
};

function normalizeLead(row: OutreachRow): LeadSummary | null {
  if (!row.ai_leads) return null;
  return Array.isArray(row.ai_leads) ? (row.ai_leads[0] ?? null) : row.ai_leads;
}

function OutreachCard({ row }: { row: OutreachRow }) {
  const lead = normalizeLead(row);
  const [message, setMessage] = React.useState(row.message);
  const [pending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [approved, setApproved] = React.useState(!!row.approved_at);
  const [contactedStatus, setContactedStatus] = React.useState(lead?.outreach_status ?? "not_contacted");

  const dirty = message !== row.message;
  const tone = lead ? leadScoreTone(lead.lead_score) : null;
  const qualMeta = lead ? aiQualificationStatusMeta(lead.qualification_status) : null;
  const outreachMeta = aiOutreachStatusMeta(contactedStatus);
  const label = lead ? lead.project_name || lead.prospect_name || lead.username || "Unnamed prospect" : "Unknown lead";

  function handleCopy() {
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveOutreachEditAction(row.id, message);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveOutreachAction(row.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setApproved(true);
    });
  }

  function handleMarkContacted() {
    if (!lead) return;
    setError(null);
    startTransition(async () => {
      const result = await markLeadContactedAction(lead.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setContactedStatus("contacted");
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{label}</p>
          {tone ? (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
              {lead!.lead_score}/100
            </span>
          ) : null}
          {qualMeta ? (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <span className={`h-1.5 w-1.5 rounded-full ${qualMeta.dotClass}`} aria-hidden="true" />
              {qualMeta.label}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-xs text-white/40">
            <span className={`h-1.5 w-1.5 rounded-full ${outreachMeta.dotClass}`} aria-hidden="true" />
            {outreachMeta.label}
          </span>
        </div>
        <span className="text-[11px] font-medium text-white/35">
          {row.generated_by_ai ? "AI draft" : "Template draft"}
          {row.is_edited || dirty ? " · Edited" : ""}
          {approved ? " · Approved" : ""}
        </span>
      </div>

      <Textarea
        className="mt-3 min-h-[120px]"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy Message"}
        </button>
        {dirty ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06] disabled:opacity-50"
          >
            {saved ? "Saved" : "Save Edit"}
          </button>
        ) : null}
        {!approved ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleApprove}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06] disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}
        {lead?.source_url ? (
          <a
            href={lead.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open Source
          </a>
        ) : null}
        <button
          type="button"
          disabled={pending || contactedStatus === "contacted"}
          onClick={handleMarkContacted}
          className="rounded-lg bg-[var(--nimia-crimson)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
        >
          {contactedStatus === "contacted" ? "Contacted" : "Mark as Contacted"}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function OutreachQueueList({ rows }: { rows: OutreachRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No outreach drafts yet — generate one from a lead&apos;s detail panel on the Leads tab.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <OutreachCard key={row.id} row={row} />
      ))}
    </div>
  );
}
