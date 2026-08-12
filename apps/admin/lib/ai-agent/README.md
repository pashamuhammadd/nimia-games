# AI Client Hunter — agent architecture (V1)

Server-only. Nothing in this directory is imported by a Client Component —
every file here either runs inside a Server Action/Route Handler
(`app/(protected)/ai-client-hunter/actions.ts`) or is invoked by one.

## Pipeline

```
Goal (AgentRunParams)
  -> Discovery        (discovery/*.ts, via discovery/registry.ts)
  -> Candidate Collection
  -> Deduplication     (tools/dedupe.ts)
  -> Filtering
  -> AI Analysis        (tools/qualify.ts + tools/extract.ts, OR
                          tools/scoreFirmographic.ts — see below)
  -> Lead Scoring        (tools/score.ts, OR tools/scoreFirmographic.ts)
  -> Qualification
  -> Database             (tools/save.ts)
  -> Dashboard
```

Two analysis/scoring paths exist, chosen per-candidate by whether
`Candidate.firmographic` is set (orchestrator.ts's `runAgentPipeline`
branches on this):

- **Text-intent path** (Demo, Reddit): `tools/qualify.ts` reads the
  candidate's raw text for an actual hiring-intent sentence, `tools/
  extract.ts` pulls budget/deadline/contact signals from that same text,
  `tools/score.ts` scores all six factors from those two outputs.
- **Firmographic path** (CoinGecko's memecoin/NFT providers):
  `tools/scoreFirmographic.ts` scores the same six factors from
  structured project data (category, official channels, market cap,
  listing/activity recency) instead — there is no sentence to read,
  because nobody said anything. Its own header comment explains why this
  had to be a separate module rather than a branch inside `tools/score.ts`:
  an *inferred* prospecting signal must never be presented, in code or in
  a lead's own `qualification_reason`, as an *expressed* one.

Both paths can still produce a `qualified` lead (score ≥
`QUALIFIED_SCORE_THRESHOLD`) — a firmographic lead just always says
plainly, in its own reason text, that no explicit request was found and a
human should review its evidence before any outreach.

`orchestrator.ts`'s `runAgentPipeline()` runs the whole thing in one call —
this is "the agent". It fits inside a single Vercel serverless invocation
(no background worker in V1); see the section below for what changes if a
future run needs more time than one invocation allows.

## Adding a new Discovery Source

1. Create `discovery/my-source-provider.ts` implementing `DiscoverySource`
   (see `types.ts`).
2. Register it in `discovery/registry.ts`.
3. Nothing else changes — the orchestrator, Find Clients page, and
   Settings page all read the registry, not any specific provider.

`DemoDiscoveryProvider`, `CoinGeckoMemecoinDiscoveryProvider`, and
`CoinGeckoNftDiscoveryProvider` are live and enabled. `WebSearchDiscoveryProvider`
/ `JobBoardDiscoveryProvider` are still structured stubs — each file's
header comment explains what credentials and implementation work would
make them real. None of these scrape, bypass auth, or contact anyone.

**`RedditDiscoveryProvider` is implemented but deliberately paused**
(`isConfigured()` hardcoded to `false`, see that file's own comment for
exactly why and how to re-enable it). Short version: after this feature
first shipped with a live Reddit integration, the user asked whether using
Reddit's official Data API for this — a for-profit lead-gen tool — counted
as commercial use under Reddit's terms and said they didn't want to
proceed if so. Research at the time (12 Agustus 2026): Reddit's Data API
Terms / Public Content Policy require a separately negotiated commercial
license for a product that uses Reddit data to power a commercial
offering — the free application-only OAuth tier this file implements is
scoped to personal/non-commercial use, and there's no self-serve upgrade
(commercial access is a direct, and per third-party reporting, costly
negotiation with Reddit). That's genuinely not legal advice and wasn't
verified with Reddit directly — if Nimia later gets Reddit's written
commercial approval, or decides the risk is acceptable, flip the one
`return false` back to the real env-var check and it works exactly as
before. `CoinGeckoMemecoinDiscoveryProvider` /
`CoinGeckoNftDiscoveryProvider` (added the same day) were built as a
commercial-use-safe replacement — CoinGecko's own API Terms explicitly
permit charging for a product built on their free tier, see
`discovery/coingecko-client.ts`'s header comment.

## Why scoring is deterministic, not an LLM call

The brief requires the 0-100 score to "remain explainable" and evidence to
never be invented. `tools/score.ts` is a plain, reproducible rule engine
for exactly that reason — the same input always produces the same score
and the same reasons. `provider.ts` (an optional Anthropic API call, only
active when `AI_PROVIDER_API_KEY` is set) is used solely to smooth prose
(a qualification write-up, an outreach draft) — it never touches a score
or a qualification_status, and every code path that calls it falls back
to the deterministic text if it's unconfigured or fails.

## Moving this behind a queue later

If a future run needs to process far more candidates than fits in one
request: `runAgentPipeline` already writes its own progress into
`ai_agent_runs` (status/counts) as it goes, and every tool in `tools/` is
a plain async function with no in-memory state — the natural next step is
calling the same tools from a queue worker (e.g. a Vercel Cron / QStash /
Supabase Edge Function job) that processes one candidate per invocation
and updates the same run row, instead of `runAgentPipeline` looping
in-process. No change to `tools/`, `discovery/`, or the database schema
would be required.
