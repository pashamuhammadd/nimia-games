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
  -> AI Analysis        (tools/qualify.ts, tools/extract.ts)
  -> Lead Scoring        (tools/score.ts)
  -> Qualification
  -> Database             (tools/save.ts)
  -> Dashboard
```

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

Only `DemoDiscoveryProvider` is live in V1. `RedditDiscoveryProvider` /
`WebSearchDiscoveryProvider` / `JobBoardDiscoveryProvider` are structured
stubs — each file's header comment explains exactly what credentials and
implementation work would make it real, and none of them scrape, bypass
auth, or contact anyone.

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
