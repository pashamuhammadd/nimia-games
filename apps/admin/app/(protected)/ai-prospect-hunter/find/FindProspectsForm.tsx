"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Label, Button } from "@nimia/ui";
import { startAgentRunAction } from "../actions";
import type { DiscoverySourceStatus } from "../../../../lib/ai-agent/types";
import { CATEGORY_TIERS, DEFAULT_MIN_OPPORTUNITY_SCORE, DEFAULT_REQUESTED_TARGET } from "../../../../lib/ai-agent/constants";

// "Run Prospect Hunter" form (spec section 18). Replaces the retired "AI
// Client Hunter"'s free-text "Goal"/"Service"/"Audience" fields — V2 has
// no text to describe a target audience with, since discovery is
// category-driven against CoinGecko, not keyword-search-driven. Category
// tiers are opt-in checkboxes; selecting none sweeps every tier (the
// registry's own default). Every configured source is opt-in via
// checkbox; an unconfigured source is shown but disabled with its own
// reason.
export function FindProspectsForm({ sources }: { sources: DiscoverySourceStatus[] }) {
  const router = useRouter();
  const [selectedTiers, setSelectedTiers] = React.useState<number[]>([]);
  const [requestedTarget, setRequestedTarget] = React.useState(DEFAULT_REQUESTED_TARGET);
  const [minOpportunityScore, setMinOpportunityScore] = React.useState(DEFAULT_MIN_OPPORTUNITY_SCORE);
  const [selectedSources, setSelectedSources] = React.useState<string[]>(
    sources.filter((s) => s.id !== "demo" && s.configured).map((s) => s.id),
  );
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ runId: string } | null>(null);

  const anyLiveConfigured = sources.some((s) => s.id !== "demo" && s.configured);

  function toggleTier(tier: number) {
    setSelectedTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]));
  }

  function toggleSource(id: string) {
    setSelectedSources((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const categorySlugs = selectedTiers.length > 0 ? CATEGORY_TIERS.filter((t) => selectedTiers.includes(t.tier)).flatMap((t) => t.categorySlugs) : [];
    startTransition(async () => {
      const response = await startAgentRunAction({
        categorySlugs,
        requestedTarget,
        minOpportunityScore,
        sourceIds: selectedSources,
      });
      if (!response.success) {
        setError(response.error);
        return;
      }
      setResult({ runId: response.data.runId });
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-white">Find Prospects</h2>
      <p className="mt-1 text-xs text-white/40">
        Discovers crypto/Web3 projects from CoinGecko and scores each one&apos;s animation opportunity. It never
        contacts anyone automatically.
      </p>

      {!anyLiveConfigured ? (
        <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
          CoinGecko isn&apos;t connected — set COINGECKO_API_KEY to run a real discovery. A run started now will fail
          with a clear error rather than showing fake data (see Settings for details).
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <Label>Target Category</Label>
          <div className="mt-1.5 flex flex-col gap-2">
            {CATEGORY_TIERS.map((tierInfo) => (
              <label
                key={tierInfo.tier}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent"
                  checked={selectedTiers.includes(tierInfo.tier)}
                  onChange={() => toggleTier(tierInfo.tier)}
                />
                <span className="flex-1">
                  <span className="font-medium text-white/85">
                    Tier {tierInfo.tier} — {tierInfo.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/40">{tierInfo.categorySlugs.join(", ")}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-white/35">Leave every tier unchecked to sweep all of them.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hunter-target">Target</Label>
            <Input
              id="hunter-target"
              type="number"
              min={1}
              max={200}
              className="mt-1.5"
              value={requestedTarget}
              onChange={(e) => setRequestedTarget(Number(e.target.value) || DEFAULT_REQUESTED_TARGET)}
            />
          </div>
          <div>
            <Label htmlFor="hunter-min-score">Minimum Opportunity Score</Label>
            <Input
              id="hunter-min-score"
              type="number"
              min={0}
              max={100}
              className="mt-1.5"
              value={minOpportunityScore}
              onChange={(e) => setMinOpportunityScore(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <Label>Sources</Label>
          <div className="mt-1.5 flex flex-col gap-2">
            {sources.map((source) => (
              <label
                key={source.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  source.configured ? "border-white/10 bg-white/[0.02]" : "border-white/[0.06] bg-white/[0.01] opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent"
                  checked={selectedSources.includes(source.id)}
                  onChange={() => toggleSource(source.id)}
                  disabled={!source.configured}
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium text-white/85">
                    {source.label}
                    {!source.configured ? (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Not connected
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/40">
                    {source.configured ? source.description : source.notConfiguredReason ?? source.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={pending} disabled={selectedSources.length === 0}>
            Run Prospect Hunter
          </Button>
          {result ? (
            <span className="text-xs text-emerald-300">
              Run complete —{" "}
              <Link href="/ai-prospect-hunter/projects" className="underline">
                view projects
              </Link>
              .
            </span>
          ) : null}
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </form>
  );
}
