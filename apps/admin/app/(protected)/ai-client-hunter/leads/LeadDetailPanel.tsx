"use client";

import * as React from "react";
import { ExternalLink, Mail } from "lucide-react";
import { Select } from "@nimia/ui";
import { AI_QUALIFICATION_STATUS_FILTERS, AI_OUTREACH_STATUS_META, leadScoreTone } from "../../../lib/aiHunterStatus";
import { formatRelativeTime } from "../../../lib/relativeTime";
import {
  setLeadQualificationStatusAction,
  setLeadOutreachStatusAction,
  markLeadContactedAction,
  generateOutreachAction,
} from "../actions";
import type { AiQualificationStatus, AiOutreachStatus } from "../../../../lib/ai-agent/types";

export type ScoreFactorRow = { score: number; max: number; reasons: string[] };
export type LeadScoreBreakdown = {
  buyingIntent: ScoreFactorRow;
  serviceFit: ScoreFactorRow;
  projectRelevance: ScoreFactorRow;
  budgetPotential: ScoreFactorRow;
  projectActivity: ScoreFactorRow;
  contactability: ScoreFactorRow;
  total: number;
};

export type LeadRow = {
  id: string;
  project_name: string | null;
  prospect_name: string | null;
  username: string | null;
  platform: string;
  source_url: string | null;
  project_url: string | null;
  detected_service: string | null;
  animation_type: string | null;
  project_description: string;
  detected_need: string | null;
  buying_intent: string;
  budget_information: string | null;
  deadline_information: string | null;
  lead_score: number;
  score_breakdown: LeadScoreBreakdown | null;
  qualification_status: string;
  qualification_reason: string | null;
  evidence: { quote: string; sourceUrl: string | null }[] | null;
  contact_method: string | null;
  contact_url: string | null;
  discovered_at: string;
  last_updated: string;
  outreach_status: string;
  is_demo: boolean;
};

const FACTOR_LABELS: { key: Exclude<keyof LeadScoreBreakdown, "total">; label: string }[] = [
  { key: "buyingIntent", label: "Buying Intent" },
  { key: "serviceFit", label: "Service Fit" },
  { key: "projectRelevance", label: "Project Relevance" },
  { key: "budgetPotential", label: "Budget Potential" },
  { key: "projectActivity", label: "Project Activity" },
  { key: "contactability", label: "Contactability" },
];

export function LeadDetailPanel({ lead, onClose }: { lead: LeadRow; onClose: () => void }) {
  const [qualification, setQualification] = React.useState(lead.qualification_status);
  const [outreach, setOutreach] = React.useState(lead.outreach_status);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [outreachNote, setOutreachNote] = React.useState<string | null>(null);

  const label = lead.project_name || lead.prospect_name || lead.username || "Unnamed prospect";
  const tone = leadScoreTone(lead.lead_score);
  const evidence = lead.evidence ?? [];
  const breakdown = lead.score_breakdown;

  function handleQualificationChange(value: string) {
    setQualification(value);
    setError(null);
    startTransition(async () => {
      const result = await setLeadQualificationStatusAction(lead.id, value as AiQualificationStatus);
      if (!result.success) setError(result.error);
    });
  }

  function handleOutreachChange(value: string) {
    setOutreach(value);
    setError(null);
    startTransition(async () => {
      const result = await setLeadOutreachStatusAction(lead.id, value as AiOutreachStatus);
      if (!result.success) setError(result.error);
    });
  }

  function handleMarkContacted() {
    setError(null);
    startTransition(async () => {
      const result = await markLeadContactedAction(lead.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOutreach("contacted");
      if (qualification === "qualified" || qualification === "possible" || qualification === "new") {
        setQualification("contacted");
      }
    });
  }

  function handleGenerateOutreach() {
    setError(null);
    setOutreachNote(null);
    startTransition(async () => {
      const result = await generateOutreachAction(lead.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOutreach("ready");
      setOutreachNote("Draft ready — review and send it from the Outreach Queue tab.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
          {lead.platform}
          {lead.is_demo ? " · Demo lead" : ""}
        </span>
        <h2 className="mt-1 text-lg font-bold text-white">{label}</h2>
        <p className="mt-1 text-xs text-white/40">
          Discovered {formatRelativeTime(lead.discovered_at)} · Updated {formatRelativeTime(lead.last_updated)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
          Lead Score: {lead.lead_score}/100
        </span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/60">
          Buying Intent: {lead.buying_intent}
        </span>
        {lead.animation_type ? (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/60">{lead.animation_type}</span>
        ) : null}
      </div>

      {breakdown ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Score Breakdown</p>
          <div className="mt-3 flex flex-col gap-3">
            {FACTOR_LABELS.map(({ key, label: factorLabel }) => {
              const factor = breakdown[key];
              if (!factor) return null;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">{factorLabel}</span>
                    <span className="font-semibold text-white/80">
                      {factor.score}/{factor.max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
                      style={{ width: `${factor.max > 0 ? (factor.score / factor.max) * 100 : 0}%` }}
                    />
                  </div>
                  {factor.reasons.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-[11px] text-white/40">
                      {factor.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Why this lead was qualified</p>
        <p className="mt-1.5 text-sm text-white/70">{lead.qualification_reason || "No reason recorded."}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Evidence</p>
        {evidence.length > 0 ? (
          <div className="mt-1.5 flex flex-col gap-2">
            {evidence.map((item, i) => (
              <blockquote key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm italic text-white/70">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-white/40">Insufficient evidence.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Detected Need</p>
          <p className="mt-1 text-white/70">{lead.detected_need ?? "Unspecified"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Budget</p>
          <p className="mt-1 text-white/70">{lead.budget_information ?? "Not mentioned"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Deadline</p>
          <p className="mt-1 text-white/70">{lead.deadline_information ?? "Not mentioned"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Contact</p>
          <p className="mt-1 text-white/70">{lead.contact_method ?? "Unknown"}</p>
        </div>
      </div>

      <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/60">{lead.project_description}</p>

      <div className="flex flex-wrap gap-2">
        {lead.source_url ? (
          <a
            href={lead.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open Source
          </a>
        ) : null}
        {lead.contact_url ? (
          <a
            href={lead.contact_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Contact Link
          </a>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={handleGenerateOutreach}
          className="rounded-lg bg-[var(--nimia-crimson)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
        >
          Generate Outreach
        </button>
        <button
          type="button"
          disabled={pending || outreach === "contacted"}
          onClick={handleMarkContacted}
          className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06] disabled:opacity-50"
        >
          Mark as Contacted
        </button>
      </div>

      {outreachNote ? <p className="text-xs text-emerald-300">{outreachNote}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Qualification Status</label>
          <Select className="mt-1.5" value={qualification} disabled={pending} onChange={(e) => handleQualificationChange(e.target.value)}>
            {AI_QUALIFICATION_STATUS_FILTERS.filter((f) => f.value !== "all").map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Outreach Status</label>
          <Select className="mt-1.5" value={outreach} disabled={pending} onChange={(e) => handleOutreachChange(e.target.value)}>
            {Object.entries(AI_OUTREACH_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={onClose}
        className="self-start text-xs font-medium text-white/40 hover:text-white/70"
      >
        Close
      </button>
    </div>
  );
}
