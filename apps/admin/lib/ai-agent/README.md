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

## Targeting: small/emerging projects, not blue-chips (fix, 13 Aug 2026)

The first version of this rewrite discovered projects via
`/coins/markets?category=X&order=market_cap_desc&page=1` only — i.e. always
the single biggest-market-cap page per category. In practice that meant
the agent mostly resurfaced the same well-known blue-chip projects every
run, which is close to the worst realistic prospect for Nimia: a project
at that size has almost always already built (or already contracted) its
own creative team, however deep its pockets.

Fixed on both sides of the pipeline:

- **Discovery** (`discovery/coingecko-project-provider.ts`) now pages past
  the top of each category and only keeps candidates whose market cap
  falls inside `[MIN_TARGET_MARKET_CAP_USD, MAX_TARGET_MARKET_CAP_USD]`
  (`constants.ts`) before spending any `/coins/{id}` detail-call budget on
  them. The NFT provider applies the same ceiling post-detail (CoinGecko's
  NFT list endpoint has no market-cap query param, so it can't pre-filter
  the way the coin sweep does — see that class's own comment).
- **Scoring** (`tools/scoreProject.ts`'s `scoreCommercialPotential`) no
  longer treats "bigger market cap" as strictly better. It peaks inside
  that same target band and tapers at both ends: too small usually means
  no real production budget yet, too big usually means they don't need an
  outside studio.

Retune the whole pipeline's targeting by adjusting the two constants in
`constants.ts` — nothing else needs to change.

## Coverage push + memecoin/new-project prioritization (19 Aug 2026)

Product direction: get more results per run, sharpen targeting, and
specifically prioritize memecoin and new/small projects (not just avoid
excluding them). Four changes, all reversible via named constants:

- **Default sweep no longer starves Tier 3/4** — `constants.ts`'s
  `defaultSweepCategorySlugs()` replaced the old `allCategorySlugs()`
  fallback used when the Find Prospects page's tier checkboxes are all
  left unchecked. The old fallback was a flat concatenation of
  `CATEGORY_TIERS` in tier order; Tier 1 (6 slugs) + Tier 2 (7 slugs)
  alone already exceeded `MAX_CATEGORIES_PER_RUN`, so **every default
  "sweep all" run silently never reached Tier 3 (Memecoin/DeFi/Payments/
  Wallets) or Tier 4 (Infrastructure) at all** — a real bug, not just a
  coverage gap. `defaultSweepCategorySlugs()` interleaves (round-robins)
  across all 4 tiers instead, with Tier 3 sequenced FIRST in every round
  per the memecoin-priority decision below.
- **Tier 3 (memecoin) category-fit score raised** — `tools/scoreProject.ts`'s
  `scoreCategoryFit` tier base went from 9/25 to 13/25 for Tier 3.
  Reasoning: memecoin projects lean heavily on animated mascots, character
  work, and meme/logo animation for community engagement — squarely
  Nimia's own Meme Animation / Character Animation / Logo Animation
  services (`knowledge/animation-services.ts`). Tier 1/2 (gaming/metaverse/
  NFT) stay highest; Tier 4 (infrastructure) is unchanged.
- **Discovery budget raised, funded by the already-discovered exclusion
  below** — `discovery/coingecko-project-provider.ts`'s
  `MAX_CATEGORIES_PER_RUN` (8→10), `MAX_MARKET_PAGES_PER_CATEGORY` (4→5),
  `IN_BAND_TARGET_PER_CATEGORY` (15→18), `MAX_DETAIL_CALLS` (40→48), and
  the NFT provider's `MAX_NFT_DETAIL_CALLS` (15→18) all moved up modestly.
  `MAX_MARKET_PAGES_PER_CATEGORY` specifically matters for "new/small"
  projects: within the in-band market-cap sweep, smaller projects tend to
  sit on later pages of the `market_cap_desc` ordering, so paging further
  is a direct lever for surfacing more of them, independent of the
  memecoin-specific changes above.
- **Rate-limit retries** — see "API-budget discipline" below; without
  this, pushing the budgets above further would have made silent data
  loss from CoinGecko's 30-calls/min free Demo limit more likely, not
  less.

## API-budget discipline

This runs on CoinGecko's free Demo plan — 30 calls/minute
(support.coingecko.com/hc/en-us/articles/4538771776153), see
`discovery/coingecko-client.ts`. `discovery/coingecko-project-provider.ts`
caps how many categories it sweeps and how many `/coins/{id}` detail calls
it makes per run (`MAX_CATEGORIES_PER_RUN`, `MAX_DETAIL_CALLS`), and
`tools/save.ts` upserts on `coingecko_id` so a project that DOES get
re-discovered refreshes its existing row instead of duplicating it.

**Skip already-discovered projects, permanently (implemented 19 Aug 2026 —
this section used to flag a 24h version of this as a future improvement,
then shipped and immediately widened to permanent same-day per explicit
product direction: "skip projek yang udah pernah tercari"):**
`orchestrator.ts` queries `ai_projects` for EVERY `coingecko_id` ever
saved (capped at 20,000 rows — PostgREST's own default cap is 1,000;
revisit if this table ever actually grows past 20k) before calling
discovery, and passes that list to each source as
`DiscoveryParams.excludeCoingeckoIds` (`types.ts`). Both
`CoinGeckoProjectDiscoveryProvider` and `CoinGeckoNftDiscoveryProvider`
skip the `/coins/{id}` (or `/nfts/{id}`) detail call for anything in that
list — the market-list call still happens (needed to know what's even in
the target band), but the expensive, rate-limited-per-call detail fetch is
only ever spent on a coingecko_id this pipeline has NEVER saved before.
This never removes anything from the dashboard: an excluded project's
existing row and `ai_prospect_status` are completely untouched, it's
simply never re-discovered by any later run. The direct trade-off: an
already-saved project's market_cap/price/social-links snapshot is frozen
at whatever it was on first discovery — there's currently no separate
"refresh what I already have" action, since re-discovery was the only
thing that ever refreshed it. If that's ever needed, it should be its own
explicit admin action (e.g. a per-project "Refresh" button in
`ProjectDetailPanel.tsx` calling `tools/save.ts` directly for that one
project), not a change to this exclusion list.

**Retry with backoff (added 19 Aug 2026):** `coingecko-client.ts`'s
`coinGeckoFetch` used to give up permanently on the first non-2xx
response — a single rate-limit hit anywhere in a run silently lost that
market page or detail call for the rest of the run, with no visible
error. It now retries up to `MAX_RATE_LIMIT_RETRIES` (2) times, honoring
CoinGecko's own `Retry-After` header on a 429 and a short fixed backoff
otherwise, before the original error propagates to the caller exactly as
before this change.

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
