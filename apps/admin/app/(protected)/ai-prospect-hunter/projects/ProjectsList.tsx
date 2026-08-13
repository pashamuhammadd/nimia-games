"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@nimia/ui";
import { aiProspectStatusMeta, opportunityLevelMeta, opportunityScoreTone } from "../../../lib/aiHunterStatus";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { ProjectDetailPanel, type ProjectRow } from "./ProjectDetailPanel";

export type { ProjectRow };

// Card-grid + Modal-detail pattern, same convention the retired Leads
// page used. Supports opening a specific project's modal on mount via
// `?open=<projectId>` — the "View Project" links on Overview's
// High-Opportunity Projects cards use this.
export function ProjectsList({ projects }: { projects: ProjectRow[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ProjectRow | null>(null);

  React.useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const match = projects.find((p) => p.id === openId);
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const haystack = [p.name, p.symbol, ...(p.categories ?? []), p.description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query]);

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No projects yet — run the AI Hunter from Find Prospects to discover some.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project name, symbol, or category..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const analysis = normalize(project.ai_project_analysis);
            const status = normalize(project.ai_prospect_status);
            const level = opportunityLevelMeta(analysis?.animation_opportunity ?? "none");
            const tone = opportunityScoreTone(analysis?.opportunity_score ?? 0);
            const statusMeta = aiProspectStatusMeta(status?.status ?? "project");
            const socials = project.social_links ?? { twitter: null, telegram: null, discord: null, reddit: null, facebook: null };

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelected(project)}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12]"
              >
                <div className="flex items-start gap-3">
                  {project.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06] object-cover" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                    <p className="truncate text-xs text-white/40">{project.symbol ? `$${project.symbol}` : "—"} · {project.categories?.[0] ?? "Uncategorized"}</p>
                  </div>
                  {project.is_demo ? (
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      Demo
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
                    {(analysis?.opportunity_score ?? 0) >= 80 ? "🔥" : "•"} {analysis?.opportunity_score ?? 0}/100
                  </span>
                  <span className={`rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${level.textClass}`}>{level.label}</span>
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} aria-hidden="true" />
                    {statusMeta.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
                  <span>MCap: {formatUsdCompact(project.market_cap_usd)}</span>
                  <span>24h Vol: {formatUsdCompact(project.volume_24h_usd)}</span>
                  <span>Launch: {project.launch_date ?? "Unknown"}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] text-white/35">
                  {socials.twitter ? <span className="rounded bg-white/[0.05] px-1.5 py-0.5">X</span> : null}
                  {socials.discord ? <span className="rounded bg-white/[0.05] px-1.5 py-0.5">Discord</span> : null}
                  {socials.telegram ? <span className="rounded bg-white/[0.05] px-1.5 py-0.5">Telegram</span> : null}
                  {project.homepage_url ? <span className="rounded bg-white/[0.05] px-1.5 py-0.5">Website</span> : null}
                  {project.developer_links?.github?.length ? <span className="rounded bg-white/[0.05] px-1.5 py-0.5">GitHub</span> : null}
                </div>

                {analysis?.recommended_services?.length ? (
                  <p className="truncate text-xs text-white/50">Recommended: {analysis.recommended_services.slice(0, 2).join(", ")}</p>
                ) : null}

                <p className="text-[10px] text-white/30">Discovered {formatRelativeTime(project.discovered_at)}</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
            No projects match &ldquo;{query}&rdquo;.
          </div>
        ) : null}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} ariaLabel="Project detail" className="max-w-2xl">
        {selected ? <ProjectDetailPanel project={selected} onClose={() => setSelected(null)} /> : null}
      </Modal>
    </>
  );
}

function normalize<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatUsdCompact(value: number | null): string {
  if (value == null) return "Not available";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
