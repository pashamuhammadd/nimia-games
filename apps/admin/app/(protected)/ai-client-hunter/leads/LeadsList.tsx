"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@nimia/ui";
import { aiQualificationStatusMeta, leadScoreTone } from "../../../lib/aiHunterStatus";
import { formatRelativeTime } from "../../../lib/relativeTime";
import { LeadDetailPanel, type LeadRow } from "./LeadDetailPanel";

export type { LeadRow };

// Card-list + Modal-detail pattern, same convention as OrdersList.tsx /
// ClientsList.tsx. Supports one extra thing those don't need: opening a
// specific lead's modal on mount via `?open=<leadId>` — the "View Lead"
// links on the Overview page's Recent Qualified Leads cards use this
// instead of trying to share client state across a full page navigation.
export function LeadsList({ leads }: { leads: LeadRow[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<LeadRow | null>(null);

  React.useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const match = leads.find((lead) => lead.id === openId);
    if (match) setSelected(match);
    // Only run once per `open` value change — leads array identity
    // changes on every server refetch (revalidatePath), which shouldn't
    // re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => {
      const haystack = [lead.project_name, lead.prospect_name, lead.username, lead.platform, lead.detected_service, lead.animation_type, lead.project_description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, query]);

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No leads yet — run the AI Hunter from Find Clients to discover some.
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
            placeholder="Search by project, name, platform, or service..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((lead) => {
            const tone = leadScoreTone(lead.lead_score);
            const meta = aiQualificationStatusMeta(lead.qualification_status);
            const label = lead.project_name || lead.prospect_name || lead.username || "Unnamed prospect";
            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => setSelected(lead)}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}
                    >
                      {lead.lead_score >= 80 ? "🔥" : "•"} {lead.lead_score}/100
                    </span>
                    {lead.is_demo ? (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Demo
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-white/35">{formatRelativeTime(lead.discovered_at)}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-white">{label}</p>
                  <p className="mt-0.5 truncate text-xs text-white/45">
                    {lead.animation_type ?? lead.detected_service ?? "Service unclear"} · {lead.platform}
                    {lead.budget_information ? ` · ${lead.budget_information}` : ""}
                  </p>
                </div>
                <span className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 sm:self-center">
                  View
                </span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
            No leads match &ldquo;{query}&rdquo;.
          </div>
        ) : null}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} ariaLabel="Lead detail" className="max-w-2xl">
        {selected ? <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} /> : null}
      </Modal>
    </>
  );
}
