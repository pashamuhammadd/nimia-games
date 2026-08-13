# AI Prospect Hunter — agent architecture (V2)

Server-only. Nothing in this directory is imported by a Client Component —
every file here either runs inside a Server Action/Route Handler
(`app/(protected)/ai-prospect-hunter/actions.ts`) or is invoked by one.

**This is a full conceptual rewrite of the retired "AI Client Hunter"
(V1)**, not a rename. V1 discovered PEOPLE who wrote a sentence expressing
hiring intent (Reddit posts, hand-written demo/job-board text). Reddit's
Data API was paused the same week V1 shipped, for commercial-license
reasons — see this app's git history for the old README's full research —
and V2 drops the text-intent model entirely. Every "project" here comes
from CoinGecko's structured API: there is no sentence to quote, no
"buying intent" to classify, no evidence to extract from free text.
Instead, the pipeline discovers real crypto/Web3 PROJECTS and infers
whether each one plausibly needs Nimia's animation services from its
public profile (category, official channels, market data).

## Pipeline

```
Goal (AgentRunParams)
  -> Discovery         (discovery/*.ts, via discovery/registry.ts)
  -> Category filtering / enrichment
  -> Deduplication      (tools/dedupe.ts)
  -> AI Analysis + Opportunity Scoring (tools/scoreProject.ts)
  -> Save               (tools/save.ts — ai_projects + ai_project_analysis
                          + ai_prospect_status)
  -> Dashboard
```

`orchestrator.ts`'s `runAgentPipeline()` runs the whole thing in one
call — this is "the agent". It fits inside a single Vercel serverless
invocation (no background worker in V2); see the section below for what
changes if a future run needs more time than one invocation allows.

## Three tables, on purpose

`packages/db/migrations/0040_ai_prospect_hunter.sql` splits what used to
be one `ai_leads` row into three:

- `ai_projects` — source-of-truth CoinGecko data ONLY. A null field means
  CoinGecko didn't report it, never a guess (spec section 21: "never
  overwrite source data with AI guesses").
- `ai_project_analysis` — the AI's read: `animation_opportunity`,
  `opportunity_score` + its full breakdown, `recommended_services`,
  `reasoning`. Upserted per project (latest analysis only).
- `ai_prospect_status` — the human pipeline stage (`project` ->
  `opportunity` -> `qualified_prospect` -> `contacted` -> `replied` ->
  `negotiation` -> `client`, or `rejected`). A CoinGecko listing is NOT
  automatically a lead (spec section 13) — every project starts at
  `project` and only crosses into `qualified_prospect` via
  `tools/save.ts`'s own score-threshold logic, never further than that
  automatically. Everything from `contacted` onward only ever changes
  from an explicit admin action.

## Adding a new Discovery Source

1. Create `discovery/my-source-provider.ts` implementing `DiscoverySource`
   (see `types.ts`).
2. Register it in `discovery/registry.ts`.
3. Nothing else changes — the orchestrator, Find Prospects page, and
   Settings page all read the registry, not any specific provider.

`CoinGeckoProjectDiscoveryProvider` (coin/token projects, category-swept
across `constants.ts`'s `CATEGORY_TIERS`) and `CoinGeckoNftDiscoveryProvider`
(NFT collections, via CoinGecko's separate `/nfts/*` API) are live and
enabled. `DemoDiscoveryProvider` exists only for local testing and is
disabled unless `AI_HUNTER_DEMO_MODE=true` is explicitly set — see that
file's own comment for why it is never a silent production fallback (a
real gap in V1, fixed here).

Reddit / Web Search / Job Board discovery providers from V1 are gone
entirely, not just unregistered — none of them fit "source = CoinGecko"
(spec section 20), and Reddit's was already permanently paused. See this
app's git history if a future source needs a starting point.

## Why scoring is deterministic, not an LLM call

The spec requires the 0-100 score to remain explainable and evidence to
never be invented. `tools/scoreProject.ts` is a plain, reproducible rule
engine for exactly that reason — the same input always produces the same
score and the same reasons, across all six dimensions (spec section 12:
Category Fit 25, Visual Potential 20, Commercial Potential 20, Activity
15, Brand Presence 10, Contactability 10). `provider.ts` (an optional
Anthropic API call, only active when `AI_PROVIDER_API_KEY` is set) is used
solely to smooth prose (an outreach draft) — it never touches a score or
a prospect_status, and every code path that calls it falls back to the
deterministic text if it's unconfigured or fails.

## API-budget discipline

This runs on CoinGecko's free Demo plan (see `discovery/coingecko-client.ts`).
`discovery/coingecko-project-provider.ts` caps how many categories it
sweeps and how many `/coins/{id}` detail calls it makes per run
(`MAX_CATEGORIES_PER_RUN`, `MAX_DETAIL_CALLS`), and `tools/save.ts`
upserts on `coingecko_id` so re-discovering the same project refreshes it
instead of duplicating it. A future improvement (not yet implemented):
skip a fresh `/coins/{id}` detail call entirely when `ai_projects.updated_at`
for that `coingecko_id` is recent enough — right now every run still
re-fetches detail for whatever the category sweep returns, deduplicated
only within that single run.

## Moving this behind a queue later

If a future run needs to process far more projects than fits in one
request: `runAgentPipeline` already writes its own progress into
`ai_agent_runs` (status/counts) as it goes, and every tool in `tools/` is
a plain async function with no in-memory state — the natural next step is
calling the same tools from a queue worker (e.g. a Vercel Cron / QStash /
Supabase Edge Function job) that processes one project per invocation and
updates the same run row, instead of `runAgentPipeline` looping
in-process. No change to `tools/`, `discovery/`, or the database schema
would be required.
