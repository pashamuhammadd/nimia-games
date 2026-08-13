-- ============================================================
-- 0040: Nimia AI Prospect Hunter (V2) — replaces the "AI Client Hunter"
-- (0039) with a project-first, CoinGecko-powered crypto/Web3 prospecting
-- module for apps/admin's AI Prospect Hunter section.
--
-- CONCEPTUAL CHANGE FROM 0039, NOT A RENAME: 0039 modeled a "lead" as a
-- PERSON who wrote a sentence expressing hiring intent (Reddit posts, job
-- listings) — project_name/prospect_name/username/buying_intent/
-- budget_information/detected_need all assume a natural-language post
-- exists to quote. That source (Reddit) is retired app-wide (paused for
-- Reddit Data API commercial-license reasons — see git history of
-- apps/admin/lib/ai-agent/README.md for the full research) and V2 no
-- longer has any text to read at all: every project below comes from
-- CoinGecko's structured API. So this migration doesn't ALTER 0039's
-- tables, it replaces them outright with a shape that matches what's
-- actually available — a PROJECT (verifiable facts: market data, official
-- links, social channels, category) plus an AI-INFERRED animation
-- opportunity read on that project, kept in a separate table so
-- source-of-truth data and AI interpretation are never confused (spec
-- section 21).
--
--   ai_agent_runs      — one row per "Run Prospect Hunter" click. Tracks
--                         the pipeline's own progress/counts, never the
--                         projects themselves. Same admin-only shape as
--                         0039's table, columns renamed to match this
--                         module's project-centric language (leads ->
--                         opportunities).
--   ai_projects        — one row per real-world crypto/Web3 project,
--                         deduplicated on `coingecko_id` (CoinGecko is the
--                         only V1 discovery source, so its own project ID
--                         is a natural, stable dedupe key — simpler than
--                         0039's dedupe_key, which had to handle
--                         multi-source text posts). Source-of-truth data
--                         ONLY: nothing in this table is ever an AI
--                         inference (spec section 21) — a null field means
--                         CoinGecko didn't report it, never a guess.
--   ai_project_analysis — the AI's read on a project: animation_opportunity,
--                         opportunity_score + its full breakdown,
--                         recommended_services, commercial_potential,
--                         reasoning. One row per project (latest analysis
--                         only, upserted — same "refresh, don't
--                         duplicate" pattern 0039's ai_leads used).
--                         Kept OUT of ai_projects on purpose (spec section
--                         21's "never overwrite source data with AI
--                         guesses" applies at the schema level too, not
--                         just in application code).
--   ai_prospect_status  — human-in-the-loop pipeline stage: 'project' ->
--                         'opportunity' -> 'qualified_prospect' ->
--                         'contacted' -> 'replied' -> 'negotiation' ->
--                         'client' (spec section 13's own diagram), plus
--                         'rejected'. Separate from ai_project_analysis so
--                         an admin's manual stage progression is never
--                         confused with (or overwritten by) a later
--                         re-analysis of the same project — same
--                         admin-managed-stage protection 0039's
--                         qualification_status had, see
--                         apps/admin/lib/ai-agent/tools/save.ts.
--   ai_outreach         — human-in-the-loop outreach drafts, same
--                         guarantee as 0039: the AI may INSERT a draft
--                         here; nothing ever flips a project's
--                         outreach_status without an explicit admin
--                         UPDATE (apps/admin's actions.ts). Sending is
--                         always a human action (spec section 19).
--
-- REPLACES 0039 outright (drop, not alter) — confirmed safe with the
-- product owner: this feature shipped the same week as this migration and
-- any rows in the old tables are from tuning/test runs, not real
-- prospecting data worth preserving. If that's ever not true for some
-- other environment, DO NOT run this migration blind — export
-- public.ai_leads first.
--
-- No secrets live in this schema at all — COINGECKO_API_KEY and
-- AI_PROVIDER_API_KEY stay server-side env vars only, read by
-- apps/admin/lib/ai-agent, never written to any table here.
--
-- Must run after 0006 (is_admin(), set_updated_at()) and 0011 (staff/
-- founder roles — ai_agent_runs.created_by can be any admin-tier user).
-- ============================================================

-- ------------------------------------------------------------------
-- Drop 0039 outright — see this file's own top comment for why this is
-- a replacement, not an in-place alter.
-- ------------------------------------------------------------------

drop table if exists public.ai_outreach cascade;
drop table if exists public.ai_lead_sources cascade;
drop table if exists public.ai_leads cascade;
drop table if exists public.ai_agent_runs cascade;

drop function if exists public.set_ai_lead_last_updated() cascade;

drop type if exists public.ai_outreach_status cascade;
drop type if exists public.ai_qualification_status cascade;
drop type if exists public.ai_buying_intent cascade;
drop type if exists public.ai_run_status cascade;

-- ------------------------------------------------------------------
-- Defensive re-run safety: drop this migration's OWN objects too, in
-- dependency order (tables before the enum types they reference). This
-- makes the script idempotent if an earlier attempt partially applied —
-- e.g. the very naming collision below (a type and table both called
-- `ai_prospect_status`) caused a real first-run failure, which may have
-- left ai_agent_runs / ai_projects / ai_project_analysis and some enum
-- types already created before Postgres hit the error. Safe to run this
-- block even on a completely fresh database (every DROP is a no-op then).
-- ------------------------------------------------------------------

drop table if exists public.ai_outreach cascade;
drop table if exists public.ai_prospect_status cascade;
drop table if exists public.ai_project_analysis cascade;
drop table if exists public.ai_projects cascade;
drop table if exists public.ai_agent_runs cascade;

drop type if exists public.ai_outreach_status cascade;
-- Both the corrected name and the original (buggy, colliding) name are
-- dropped here — if your first attempt failed before reaching the
-- `create type` statement, neither ever existed and these are no-ops.
drop type if exists public.ai_prospect_stage cascade;
drop type if exists public.ai_prospect_status cascade;
drop type if exists public.ai_analysis_status cascade;
drop type if exists public.ai_commercial_potential cascade;
drop type if exists public.ai_opportunity_level cascade;
drop type if exists public.ai_run_status cascade;

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------

create type public.ai_run_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- Mirrors apps/admin/lib/ai-agent/types.ts's AiOpportunityLevel exactly —
-- if you add a value to one, add it here too. Deliberately never implies
-- "expressed interest" (see ai_project_analysis.reasoning's own comment
-- below) — this is always an inferred read on a project's profile.
create type public.ai_opportunity_level as enum (
  'very_high',
  'high',
  'medium',
  'low',
  'none'
);

create type public.ai_commercial_potential as enum (
  'very_high',
  'high',
  'medium',
  'low'
);

create type public.ai_analysis_status as enum (
  'pending',
  'completed',
  'failed'
);

-- Spec section 13's own pipeline diagram: Project -> Animation Opportunity
-- -> Qualified Prospect -> Contacted -> Replied -> Negotiation -> Client,
-- plus 'rejected' for a project a human decided isn't a fit. 'project' is
-- the floor every discovered project starts at (spec section 13: "A
-- CoinGecko project is NOT automatically a lead") — moving past
-- 'qualified_prospect' is always an explicit admin action (enforced in
-- apps/admin's server actions, not a DB constraint, same convention 0039
-- used for qualification_status).
--
-- Named `ai_prospect_stage`, NOT `ai_prospect_status` — the table below
-- that stores this column is itself called `ai_prospect_status`, and
-- Postgres implicitly creates a composite row type for every table with
-- the table's own name. A type and a table can never share a name in the
-- same schema (error 42710), so the enum gets the distinct name here.
create type public.ai_prospect_stage as enum (
  'project',
  'opportunity',
  'qualified_prospect',
  'contacted',
  'replied',
  'negotiation',
  'client',
  'rejected'
);

create type public.ai_outreach_status as enum (
  'not_contacted',
  'ready',
  'contacted',
  'replied',
  'no_response',
  'interested',
  'not_interested'
);

-- ------------------------------------------------------------------
-- ai_agent_runs
-- ------------------------------------------------------------------

create table public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),

  -- What the admin asked for on the Find Prospects page — plain columns
  -- (not one jsonb blob) so the Agent Runs page can filter/sort directly,
  -- same reasoning 0039 had.
  target_categories text[] not null default '{}',
  requested_target integer not null default 20,
  min_opportunity_score integer not null default 70 check (min_opportunity_score between 0 and 100),
  sources text[] not null default '{}',

  -- Only ever true for an explicit, opt-in dev/test run (AI_HUNTER_DEMO_MODE
  -- env var — see apps/admin/lib/ai-agent/discovery/demo-provider.ts).
  -- UNLIKE 0039, this is never a silent automatic fallback when CoinGecko
  -- isn't configured — a misconfigured production run fails clearly
  -- instead (spec section 25), it does not quietly substitute demo data.
  is_demo boolean not null default false,

  status public.ai_run_status not null default 'pending',

  projects_discovered integer not null default 0,
  projects_analyzed integer not null default 0,
  qualified_opportunities integer not null default 0,
  rejected_projects integer not null default 0,
  -- Array of { step, message, at } — every tool/pipeline-stage failure
  -- caught along the way, so a run can finish 'completed' with partial
  -- results AND a visible error list.
  errors jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_agent_runs_status_idx on public.ai_agent_runs (status);
create index ai_agent_runs_created_at_idx on public.ai_agent_runs (created_at desc);

-- ------------------------------------------------------------------
-- ai_projects — source-of-truth CoinGecko data ONLY, never an AI guess.
-- ------------------------------------------------------------------

create table public.ai_projects (
  id uuid primary key default gen_random_uuid(),

  coingecko_id text not null,
  name text not null,
  symbol text,
  description text,
  -- CoinGecko's own category labels for this project (e.g. "Gaming",
  -- "Metaverse") — verbatim from the API, never invented. The tier
  -- (1-4, spec section 6) is a UI/scoring-time lookup against these, not
  -- stored redundantly here.
  categories text[] not null default '{}',
  logo_url text,

  homepage_url text,
  whitepaper_url text,
  docs_url text,
  explorer_url text,
  blockchain_platforms text[] not null default '{}',

  -- NEVER "first listed" — see this column's own migration-file comment
  -- history. Null when CoinGecko's `genesis_date` field is empty; never
  -- estimated.
  launch_date date,
  -- Only ever set when the discovery source actually reports it (e.g.
  -- CoinGecko's /coins/list/new `activated_at`, only available for very
  -- recently listed coins) — null otherwise. This is intentionally a
  -- DIFFERENT field from launch_date; conflating "added to CoinGecko"
  -- with "the project's real launch" was an explicit spec requirement
  -- (section 8) to avoid.
  first_listed_at timestamptz,

  current_price_usd numeric,
  market_cap_usd numeric,
  fully_diluted_valuation_usd numeric,
  volume_24h_usd numeric,
  market_cap_rank integer,
  circulating_supply numeric,
  total_supply numeric,
  max_supply numeric,
  ath_usd numeric,
  ath_date timestamptz,
  atl_usd numeric,
  atl_date timestamptz,
  price_change_24h_pct numeric,

  -- { twitter, telegram, discord, reddit, facebook, github } — only keys
  -- CoinGecko's own response actually populated are ever set; see
  -- apps/admin/lib/ai-agent/discovery/coingecko-project-provider.ts.
  social_links jsonb not null default '{}'::jsonb,
  -- { github: string[], sourceCode: string[] } — kept separate from
  -- social_links since spec section 8 lists "Developer Links" as its own
  -- data category.
  developer_links jsonb not null default '{}'::jsonb,

  -- The exact CoinGecko /coins/{id} response this row was built from —
  -- kept for debugging/re-analysis without a fresh API call, and as an
  -- audit trail of exactly what CoinGecko said at discovery time. Never
  -- read by the UI directly.
  raw_source_data jsonb,

  -- Demo-mode projects are permanently flagged as such (carried over from
  -- ai_agent_runs.is_demo at insert time) so the Projects/Overview UI can
  -- filter them out with a single column. See ai_agent_runs.is_demo's own
  -- comment for why this can never happen silently in production.
  is_demo boolean not null default false,

  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index ai_projects_coingecko_id_key on public.ai_projects (coingecko_id);
create index ai_projects_market_cap_rank_idx on public.ai_projects (market_cap_rank);
create index ai_projects_categories_idx on public.ai_projects using gin (categories);
create index ai_projects_discovered_at_idx on public.ai_projects (discovered_at desc);

create trigger set_ai_projects_updated_at
  before update on public.ai_projects
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- ai_project_analysis — the AI's read on a project. One row per project,
-- upserted (latest analysis only) — see this file's own top comment for
-- why this is deliberately NOT merged into ai_projects.
-- ------------------------------------------------------------------

create table public.ai_project_analysis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ai_projects (id) on delete cascade,
  run_id uuid references public.ai_agent_runs (id) on delete set null,

  analysis_status public.ai_analysis_status not null default 'pending',

  animation_opportunity public.ai_opportunity_level not null default 'none',
  opportunity_score integer not null default 0 check (opportunity_score between 0 and 100),
  -- { categoryFit: {score,max,reasons[]}, visualPotential: {...},
  --   commercialPotential: {...}, activity: {...}, brandPresence: {...},
  --   contactability: {...} } — see apps/admin/lib/ai-agent/tools/
  -- scoreProject.ts, the single source of truth for this shape. Stored
  -- (not recomputed on every page view) so a project's score explanation
  -- stays stable even if scoring weights change later (spec section 12:
  -- "the AI must show the score breakdown").
  score_breakdown jsonb not null default '{}'::jsonb,
  -- Same 0-100 as opportunity_score — see scoreProject.ts's own header
  -- comment for why this is a distinct column rather than reusing
  -- opportunity_score directly (spec section 11 lists both `project_fit`
  -- and the opportunity_score breakdown as separate outputs).
  project_fit integer not null default 0 check (project_fit between 0 and 100),

  commercial_potential public.ai_commercial_potential not null default 'low',
  -- Free text, not an enum — matched against (but not restricted to) the
  -- taxonomy in apps/admin/lib/ai-agent/knowledge/animation-services.ts,
  -- same reasoning 0039 had for detected_service.
  recommended_services text[] not null default '{}',

  -- Project-specific "why", never a generic "this project is on
  -- CoinGecko, therefore..." — spec section 11's GOOD/BAD examples are
  -- enforced in apps/admin/lib/ai-agent/tools/scoreProject.ts's reasoning
  -- builder, not here, but this column is where that text lives.
  reasoning text,

  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ai_project_analysis_project_id_key on public.ai_project_analysis (project_id);
create index ai_project_analysis_run_id_idx on public.ai_project_analysis (run_id);
create index ai_project_analysis_opportunity_score_idx on public.ai_project_analysis (opportunity_score desc);
create index ai_project_analysis_animation_opportunity_idx on public.ai_project_analysis (animation_opportunity);

create trigger set_ai_project_analysis_updated_at
  before update on public.ai_project_analysis
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- ai_prospect_status — human pipeline stage, one row per project.
-- Separate from ai_project_analysis so a re-analysis run never clobbers
-- an admin's manual stage progression — see apps/admin/lib/ai-agent/
-- tools/save.ts's admin-managed-stage guard.
-- ------------------------------------------------------------------

create table public.ai_prospect_status (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ai_projects (id) on delete cascade,

  status public.ai_prospect_stage not null default 'project',
  outreach_status public.ai_outreach_status not null default 'not_contacted',
  notes text,

  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index ai_prospect_status_project_id_key on public.ai_prospect_status (project_id);
create index ai_prospect_status_status_idx on public.ai_prospect_status (status);
create index ai_prospect_status_outreach_status_idx on public.ai_prospect_status (outreach_status);

create trigger set_ai_prospect_status_updated_at
  before update on public.ai_prospect_status
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- ai_outreach — human-in-the-loop draft messages, same guarantee 0039 had.
-- ------------------------------------------------------------------

create table public.ai_outreach (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ai_projects (id) on delete cascade,

  message text not null,
  is_edited boolean not null default false,
  generated_by_ai boolean not null default true,
  generated_at timestamptz not null default now(),

  -- Purely informational — approving/marking-contacted here does NOT by
  -- itself change ai_prospect_status.outreach_status; apps/admin's
  -- actions.ts sets both explicitly in the same server action, same
  -- convention 0039 used.
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_outreach_project_id_idx on public.ai_outreach (project_id);

create trigger set_ai_outreach_updated_at
  before update on public.ai_outreach
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- RLS — flat admin-only, same shape as 0039 / services_admin_write (0006).
-- Nothing in this feature is ever client-visible.
-- ------------------------------------------------------------------

alter table public.ai_agent_runs enable row level security;
alter table public.ai_projects enable row level security;
alter table public.ai_project_analysis enable row level security;
alter table public.ai_prospect_status enable row level security;
alter table public.ai_outreach enable row level security;

create policy "ai_agent_runs_admin_all" on public.ai_agent_runs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_projects_admin_all" on public.ai_projects
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_project_analysis_admin_all" on public.ai_project_analysis
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_prospect_status_admin_all" on public.ai_prospect_status
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_outreach_admin_all" on public.ai_outreach
  for all using (public.is_admin()) with check (public.is_admin());
