"use client";

import * as React from "react";
import { ExternalLink, GitFork, Globe, MessageCircle, Send } from "lucide-react";
import { Select } from "@nimia/ui";
import { AI_PROSPECT_STATUS_FILTERS, AI_OUTREACH_STATUS_META, opportunityLevelMeta, opportunityScoreTone } from "../../../lib/aiHunterStatus";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { setProspectStatusAction, setOutreachStatusAction, markProjectContactedAction, generateOutreachAction } from "../actions";
import type { AiProspectStatus, AiOutreachStatus } from "../../../../lib/ai-agent/types";

export type ScoreFactorRow = { score: number; max: number; reasons: string[] };
export type OpportunityScoreBreakdownRow = {
  categoryFit: ScoreFactorRow;
  visualPotential: ScoreFactorRow;
  commercialPotential: ScoreFactorRow;
  activity: ScoreFactorRow;
  brandPresence: ScoreFactorRow;
  contactability: ScoreFactorRow;
  total: number;
};

export type ProjectAnalysisRow = {
  animation_opportunity: string;
  opportunity_score: number;
  score_breakdown: OpportunityScoreBreakdownRow | null;
  project_fit: number;
  commercial_potential: string;
  recommended_services: string[] | null;
  reasoning: string | null;
  analysis_status: string;
  analyzed_at: string | null;
};

export type ProspectStatusRow = {
  id: string;
  status: string;
  outreach_status: string;
  notes: string | null;
};

export type SocialLinksRow = { twitter: string | null; telegram: string | null; discord: string | null; reddit: string | null; facebook: string | null };
export type DeveloperLinksRow = { github: string[]; sourceCode: string[] };

export type ProjectRow = {
  id: string;
  name: string;
  symbol: string | null;
  description: string | null;
  categories: string[];
  logo_url: string | null;
  homepage_url: string | null;
  whitepaper_url: string | null;
  docs_url: string | null;
  explorer_url: string | null;
  blockchain_platforms: string[];
  launch_date: string | null;
  first_listed_at: string | null;
  current_price_usd: number | null;
  market_cap_usd: number | null;
  fully_diluted_valuation_usd: number | null;
  volume_24h_usd: number | null;
  market_cap_rank: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath_usd: number | null;
  ath_date: string | null;
  atl_usd: number | null;
  atl_date: string | null;
  price_change_24h_pct: number | null;
  social_links: SocialLinksRow | null;
  developer_links: DeveloperLinksRow | null;
  is_demo: boolean;
  discovered_at: string;
  updated_at: string;
  ai_project_analysis: ProjectAnalysisRow | ProjectAnalysisRow[] | null;
  ai_prospect_status: ProspectStatusRow | ProspectStatusRow[] | null;
};

const FACTOR_LABELS: { key: Exclude<keyof OpportunityScoreBreakdownRow, "total">; label: string }[] = [
  { key: "categoryFit", label: "Category Fit" },
  { key: "visualPotential", label: "Product / Visual Potential" },
  { key: "commercialPotential", label: "Commercial Potential" },
  { key: "activity", label: "Project Activity" },
  { key: "brandPresence", label: "Brand / Community Presence" },
  { key: "contactability", label: "Information / Contactability" },
];

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatUsd(value: number | null): string {
  if (value == null) return "Not available";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: value < 1 ? 6 : 2 })}`;
}

function formatCompact(value: number | null): string {
  if (value == null) return "Not available";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function ProjectDetailPanel({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const analysis = one(project.ai_project_analysis);
  const initialStatusRow = one(project.ai_prospect_status);

  const [status, setStatus] = React.useState(initialStatusRow?.status ?? "project");
  const [outreach, setOutreach] = React.useState(initialStatusRow?.outreach_status ?? "not_contacted");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [outreachNote, setOutreachNote] = React.useState<string | null>(null);

  const level = opportunityLevelMeta(analysis?.animation_opportunity ?? "none");
  const tone = opportunityScoreTone(analysis?.opportunity_score ?? 0);
  const breakdown = analysis?.score_breakdown ?? null;
  const socials = project.social_links ?? { twitter: null, telegram: null, discord: null, reddit: null, facebook: null };
  const dev = project.developer_links ?? { github: [], sourceCode: [] };

  function handleStatusChange(value: string) {
    setStatus(value);
    setError(null);
    startTransition(async () => {
      const result = await setProspectStatusAction(project.id, value as AiProspectStatus);
      if (!result.success) setError(result.error);
    });
  }

  function handleOutreachChange(value: string) {
    setOutreach(value);
    setError(null);
    startTransition(async () => {
      const result = await setOutreachStatusAction(project.id, value as AiOutreachStatus);
      if (!result.success) setError(result.error);
    });
  }

  function handleMarkContacted() {
    setError(null);
    startTransition(async () => {
      const result = await markProjectContactedAction(project.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOutreach("contacted");
      if (["project", "opportunity", "qualified_prospect"].includes(status)) setStatus("contacted");
    });
  }

  function handleGenerateOutreach() {
    setError(null);
    setOutreachNote(null);
    startTransition(async () => {
      const result = await generateOutreachAction(project.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOutreach("ready");
      setOutreachNote("Draft ready — review and send it from the Outreach tab.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview */}
      <div className="flex items-start gap-3">
        {project.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white/[0.06] object-cover" />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-full bg-white/[0.06]" />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
            {project.categories?.join(", ") || "Uncategorized"}
            {project.is_demo ? " · Demo project" : ""}
          </span>
          <h2 className="mt-0.5 text-lg font-bold text-white">
            {project.name}
            {project.symbol ? <span className="ml-1.5 text-white/40">${project.symbol}</span> : null}
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Discovered {formatRelativeTime(project.discovered_at)} · Updated {formatRelativeTime(project.updated_at)}
          </p>
        </div>
      </div>

      <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" className="self-start text-sm font-medium text-white/50 underline hover:text-white/70">
        Powered by CoinGecko
      </a>

      {project.description ? <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/60">{project.description}</p> : null}

      {/* Opportunity Score */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
          Opportunity Score: {analysis?.opportunity_score ?? 0}/100
        </span>
        <span className={`rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium ${level.textClass}`}>Opportunity: {level.label}</span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/60">
          Commercial Potential: {analysis?.commercial_potential ?? "low"}
        </span>
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

      {/* AI Animation Analysis */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">AI Animation Analysis</p>
        <p className="mt-1.5 text-sm text-white/70">{analysis?.reasoning || "Analysis not yet available for this project."}</p>
      </div>

      {analysis?.recommended_services?.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Recommended Nimia Services</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {analysis.recommended_services.map((service) => (
              <span key={service} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
                {service}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Market Data */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Market Data</p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Price" value={formatUsd(project.current_price_usd)} />
          <Field label="Market Cap" value={formatCompact(project.market_cap_usd)} />
          <Field label="FDV" value={formatCompact(project.fully_diluted_valuation_usd)} />
          <Field label="24h Volume" value={formatCompact(project.volume_24h_usd)} />
          <Field label="Market Cap Rank" value={project.market_cap_rank ? `#${project.market_cap_rank}` : "Not available"} />
          <Field label="24h Change" value={project.price_change_24h_pct != null ? `${project.price_change_24h_pct.toFixed(2)}%` : "Not available"} />
          <Field label="Circulating Supply" value={project.circulating_supply?.toLocaleString() ?? "Not available"} />
          <Field label="Total Supply" value={project.total_supply?.toLocaleString() ?? "Not available"} />
          <Field label="Max Supply" value={project.max_supply?.toLocaleString() ?? "Not available"} />
          <Field label="ATH" value={formatUsd(project.ath_usd)} />
          <Field label="ATL" value={formatUsd(project.atl_usd)} />
        </div>
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Timeline</p>
        <div className="mt-1.5 grid grid-cols-2 gap-3 text-sm">
          <Field label="Launch Date" value={project.launch_date ?? "Unknown"} />
          <Field label="First Listed (CoinGecko)" value={project.first_listed_at ? new Date(project.first_listed_at).toLocaleDateString() : "Not available"} />
        </div>
      </div>

      {/* Project Information */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Project Information</p>
        <div className="mt-1.5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Blockchain Platforms" value={project.blockchain_platforms?.length ? project.blockchain_platforms.join(", ") : "Not available"} />
          <Field label="Categories" value={project.categories?.length ? project.categories.join(", ") : "Uncategorized"} />
        </div>
      </div>

      {/* Official Links / Social Media / Developer Resources — open only, never auto-outreach (spec section 19) */}
      <div className="flex flex-wrap gap-2">
        {project.homepage_url ? <LinkButton href={project.homepage_url} icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />} label="Open Website" /> : null}
        {project.whitepaper_url ? <LinkButton href={project.whitepaper_url} icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />} label="Whitepaper" /> : null}
        {project.explorer_url ? <LinkButton href={project.explorer_url} icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />} label="Explorer" /> : null}
        {socials.twitter ? <LinkButton href={socials.twitter} icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />} label="Open X" /> : null}
        {socials.telegram ? <LinkButton href={socials.telegram} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" />} label="Open Telegram" /> : null}
        {socials.discord ? <LinkButton href={socials.discord} icon={<MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />} label="Open Discord" /> : null}
        {socials.reddit ? <LinkButton href={socials.reddit} icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />} label="Open Reddit" /> : null}
        {dev.github[0] ? <LinkButton href={dev.github[0]} icon={<GitFork className="h-3.5 w-3.5" aria-hidden="true" />} label="Open GitHub" /> : null}
      </div>

      {!project.homepage_url && !socials.twitter && !socials.discord && !socials.telegram && !dev.github[0] ? (
        <p className="text-xs text-white/40">No official links available for this project.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
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

      {/* Prospect Status / Outreach */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Prospect Status</label>
          <Select className="mt-1.5" value={status} disabled={pending} onChange={(e) => handleStatusChange(e.target.value)}>
            {AI_PROSPECT_STATUS_FILTERS.filter((f) => f.value !== "all").map((f) => (
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

      <button type="button" onClick={onClose} className="self-start text-xs font-medium text-white/40 hover:text-white/70">
        Close
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-0.5 text-white/70">{value}</p>
    </div>
  );
}

function LinkButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
    >
      {icon} {label}
    </a>
  );
}
