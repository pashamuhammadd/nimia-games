import { listDiscoverySourceStatuses } from "../../../../lib/ai-agent/discovery/registry";
import { aiProviderStatusMessage, isAiProviderConfigured } from "../../../../lib/ai-agent/provider";
import { SCORE_MAX, SCORE_TOTAL_MAX, QUALIFIED_SCORE_THRESHOLD, POSSIBLE_SCORE_THRESHOLD } from "../../../../lib/ai-agent/constants";
import { ANIMATION_SERVICE_CATEGORIES } from "../../../../lib/ai-agent/knowledge/animation-services";

export const metadata = { title: "AI Client Hunter · Settings" };

const FACTOR_ROWS: { key: keyof typeof SCORE_MAX; label: string }[] = [
  { key: "buyingIntent", label: "Buying Intent" },
  { key: "serviceFit", label: "Service Fit" },
  { key: "projectRelevance", label: "Project Relevance" },
  { key: "budgetPotential", label: "Budget / Commercial Potential" },
  { key: "projectActivity", label: "Project Activity" },
  { key: "contactability", label: "Contactability" },
];

// Read-only configuration status page — V1 has no persisted, editable
// settings of its own (no API keys or secrets are ever handled in the
// browser, per brief section 18/20). This page exists so an admin can see
// AT A GLANCE what's actually connected before running the AI Hunter,
// without digging through env vars or code.
export default function AIHunterSettingsPage() {
  const sources = listDiscoverySourceStatuses();
  const aiConfigured = isAiProviderConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Discovery Sources</h2>
        <p className="mt-1 text-xs text-white/40">
          Configured via server-side environment variables only — see apps/admin/.env.example. Never editable from
          this UI, since that would mean handling API credentials in the browser.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {sources.map((source) => (
            <div key={source.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium text-white/85">{source.label}</p>
                <p className="mt-0.5 text-xs text-white/40">{source.configured ? source.description : source.notConfiguredReason}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  source.configured ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/40"
                }`}
              >
                {source.configured ? "Connected" : "Not connected"}
              </span>
            </div>
          ))}
        </div>
        {sources.every((s) => s.id === "demo" || !s.configured) ? (
          <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
            Demo discovery source active — every lead currently generated is sample data, not a real prospect.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">AI Provider</h2>
        <p className="mt-1.5 text-xs text-white/40">{aiProviderStatusMessage()}</p>
        <p className="mt-2 text-xs text-white/35">
          The lead score and qualification status are always computed by the built-in deterministic scoring engine
          (see below) — the AI provider, when configured, only polishes prose (qualification write-ups, outreach
          drafts) and can never change a score or invent evidence.
        </p>
        {!aiConfigured ? (
          <p className="mt-2 text-xs text-white/35">
            Set <code className="rounded bg-white/[0.08] px-1 py-0.5">AI_PROVIDER_API_KEY</code> and{" "}
            <code className="rounded bg-white/[0.08] px-1 py-0.5">AI_MODEL</code> in <code className="rounded bg-white/[0.08] px-1 py-0.5">.env.local</code> to enable it.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Lead Scoring (0–{SCORE_TOTAL_MAX})</h2>
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          {FACTOR_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between border-b border-white/[0.05] py-1.5 last:border-0">
              <span className="text-white/70">{row.label}</span>
              <span className="font-semibold text-white/85">0–{SCORE_MAX[row.key]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Score ≥ {QUALIFIED_SCORE_THRESHOLD} → Qualified · Score ≥ {POSSIBLE_SCORE_THRESHOLD} → Possible · below that →
          Rejected. Every factor always lists the specific reasons behind its number — see a lead&apos;s detail panel
          on the Leads tab.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Animation Services Knowledge Base</h2>
        <p className="mt-1 text-xs text-white/40">What the AI matches prospect text against — see this app&apos;s lib/ai-agent/knowledge/animation-services.ts.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ANIMATION_SERVICE_CATEGORIES.map((category) => (
            <span key={category.id} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/65">
              {category.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
