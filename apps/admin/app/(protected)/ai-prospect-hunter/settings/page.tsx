import { listDiscoverySourceStatuses } from "../../../../lib/ai-agent/discovery/registry";
import { aiProviderStatusMessage, isAiProviderConfigured } from "../../../../lib/ai-agent/provider";
import { isDemoModeEnabled } from "../../../../lib/ai-agent/discovery/demo-provider";
import { SCORE_MAX, SCORE_TOTAL_MAX, QUALIFIED_SCORE_THRESHOLD, OPPORTUNITY_SCORE_THRESHOLD, CATEGORY_TIERS } from "../../../../lib/ai-agent/constants";
import { ANIMATION_SERVICE_CATEGORIES } from "../../../../lib/ai-agent/knowledge/animation-services";

export const metadata = { title: "AI Prospect Hunter · Settings" };

const FACTOR_ROWS: { key: keyof typeof SCORE_MAX; label: string }[] = [
  { key: "categoryFit", label: "Category Fit" },
  { key: "visualPotential", label: "Product / Visual Potential" },
  { key: "commercialPotential", label: "Commercial Potential" },
  { key: "activity", label: "Project Activity" },
  { key: "brandPresence", label: "Brand / Community Presence" },
  { key: "contactability", label: "Information / Contactability" },
];

// Read-only configuration status page — no persisted, editable settings
// of its own (no API keys or secrets are ever handled in the browser).
export default function AIHunterSettingsPage() {
  const sources = listDiscoverySourceStatuses();
  const aiConfigured = isAiProviderConfigured();
  const demoMode = isDemoModeEnabled();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Discovery Sources</h2>
        <p className="mt-1 text-xs text-white/40">
          Configured via server-side environment variables only — see apps/admin/.env.example. Never editable from
          this UI.
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
          <p className="mt-3 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">
            CoinGecko data unavailable — no live discovery source is connected. Runs will fail with a clear error
            instead of showing fake data.{demoMode ? " AI_HUNTER_DEMO_MODE is set — you can still run the Demo source for local testing." : ""}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Category Tiers</h2>
        <p className="mt-1 text-xs text-white/40">CoinGecko category slugs swept per tier — see Find Prospects.</p>
        <div className="mt-3 flex flex-col gap-2">
          {CATEGORY_TIERS.map((tier) => (
            <div key={tier.tier} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <p className="text-sm font-medium text-white/85">
                Tier {tier.tier} — {tier.label}
              </p>
              <p className="mt-0.5 text-xs text-white/40">{tier.categorySlugs.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">AI Provider</h2>
        <p className="mt-1.5 text-xs text-white/40">{aiProviderStatusMessage()}</p>
        <p className="mt-2 text-xs text-white/35">
          The opportunity score is always computed by the built-in deterministic scoring engine (see below) — the AI
          provider, when configured, only polishes outreach draft prose and can never change a score.
        </p>
        {!aiConfigured ? (
          <p className="mt-2 text-xs text-white/35">
            Set <code className="rounded bg-white/[0.08] px-1 py-0.5">AI_PROVIDER_API_KEY</code> and{" "}
            <code className="rounded bg-white/[0.08] px-1 py-0.5">AI_MODEL</code> in <code className="rounded bg-white/[0.08] px-1 py-0.5">.env.local</code> to enable it.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Opportunity Scoring (0–{SCORE_TOTAL_MAX})</h2>
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          {FACTOR_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between border-b border-white/[0.05] py-1.5 last:border-0">
              <span className="text-white/70">{row.label}</span>
              <span className="font-semibold text-white/85">0–{SCORE_MAX[row.key]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Score ≥ {QUALIFIED_SCORE_THRESHOLD} → Qualified Prospect · Score ≥ {OPPORTUNITY_SCORE_THRESHOLD} → Opportunity · below that →
          Project (not rejected, just not yet a strong fit). Every factor always lists the specific reasons behind
          its number — see a project&apos;s detail panel on the Projects tab.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Animation Services Knowledge Base</h2>
        <p className="mt-1 text-xs text-white/40">What a project&apos;s category is matched against — see this app&apos;s lib/ai-agent/knowledge/animation-services.ts.</p>
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
