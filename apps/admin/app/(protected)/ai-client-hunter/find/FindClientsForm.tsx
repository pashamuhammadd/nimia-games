"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Label, Button } from "@nimia/ui";
import { startAgentRunAction } from "../actions";
import type { DiscoverySourceStatus } from "../../../../lib/ai-agent/types";
import { DEFAULT_MIN_LEAD_SCORE, DEFAULT_REQUESTED_LEADS } from "../../../../lib/ai-agent/constants";

// "Find Animation Clients" form (brief section 11). Every configured
// source is opt-in via checkbox; an unconfigured source is shown but
// disabled with its own reason (never silently offered as if it works).
// If NOTHING selected/configured actually has live credentials, the
// orchestrator itself falls back to the Demo Discovery Provider and says
// so in the run's own errors/notices log — the banner below mirrors that
// so it's visible before the admin even clicks Start.
export function FindClientsForm({ sources }: { sources: DiscoverySourceStatus[] }) {
  const router = useRouter();
  const [target, setTarget] = React.useState("Find potential clients who need animation services");
  const [serviceFilter, setServiceFilter] = React.useState("Animation");
  const [audienceFilter, setAudienceFilter] = React.useState("");
  const [requestedLeads, setRequestedLeads] = React.useState(DEFAULT_REQUESTED_LEADS);
  const [minLeadScore, setMinLeadScore] = React.useState(DEFAULT_MIN_LEAD_SCORE);
  const [selectedSources, setSelectedSources] = React.useState<string[]>(["demo"]);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    runId: string;
  } | null>(null);

  const anyLiveConfigured = sources.some((s) => s.id !== "demo" && s.configured);
  const willUseDemoOnly = selectedSources.every((id) => id === "demo" || !sources.find((s) => s.id === id)?.configured);

  function toggleSource(id: string) {
    setSelectedSources((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await startAgentRunAction({
        target,
        serviceFilter,
        audienceFilter,
        requestedLeads,
        minLeadScore,
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
      <h2 className="text-sm font-semibold text-white">Find Animation Clients</h2>
      <p className="mt-1 text-xs text-white/40">
        Describe what to look for. Nimia AI Client Hunter only ever discovers, scores, and prepares prospects — it
        never contacts anyone automatically.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <Label htmlFor="hunter-target">Goal</Label>
          <Input
            id="hunter-target"
            className="mt-1.5"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder='e.g. "Find potential clients who need animation"'
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hunter-service">Service</Label>
            <Input id="hunter-service" className="mt-1.5" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hunter-audience">Target Audience</Label>
            <Input
              id="hunter-audience"
              className="mt-1.5"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              placeholder="e.g. Web3 / Crypto / Gaming"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hunter-daily-target">Daily Target</Label>
            <Input
              id="hunter-daily-target"
              type="number"
              min={1}
              max={200}
              className="mt-1.5"
              value={requestedLeads}
              onChange={(e) => setRequestedLeads(Number(e.target.value) || DEFAULT_REQUESTED_LEADS)}
            />
          </div>
          <div>
            <Label htmlFor="hunter-min-score">Minimum Lead Score</Label>
            <Input
              id="hunter-min-score"
              type="number"
              min={0}
              max={100}
              className="mt-1.5"
              value={minLeadScore}
              onChange={(e) => setMinLeadScore(Number(e.target.value) || 0)}
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

        {willUseDemoOnly ? (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
            {anyLiveConfigured
              ? "Only the Demo Discovery Provider is selected — leads generated will be sample data, not real prospects."
              : "No live discovery source is connected yet. Demo discovery source active — leads generated will be sample data, not real prospects."}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={pending} disabled={selectedSources.length === 0}>
            Start AI Hunter
          </Button>
          {result ? (
            <span className="text-xs text-emerald-300">
              Run complete —{" "}
              <Link href="/ai-client-hunter/leads" className="underline">
                view leads
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
