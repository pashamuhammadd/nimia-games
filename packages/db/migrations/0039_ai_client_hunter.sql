-- ============================================================
-- 0039: Nimia AI Animation Client Hunter (V1) — discovery + qualification
-- module for apps/admin's new "AI Client Hunter" section.
--
-- Four new tables, all 100% admin/staff-only (no client-facing row ever
-- exists here — a prospect is not a Nimia client yet, and RLS reflects
-- that: every policy below is a flat `is_admin()` gate, same "for all
-- using (public.is_admin()) with check (public.is_admin())" shape as
-- `services_admin_write` (0006), rather than the owner-or-admin pattern
-- `orders`/`clients` use).
--
--   ai_agent_runs    — one row per "Start AI Hunter" click (or future
--                       scheduled run). Tracks the pipeline's own
--                       progress/counts, never the leads themselves.
--   ai_leads         — the qualified/possible/rejected prospects
--                       themselves. One row per real-world prospect,
--                       deduplicated via `dedupe_key` (see below) so the
--                       same person found again on a later run updates
--                       the existing row instead of creating a duplicate.
--   ai_lead_sources  — append-only evidence trail: every discovery hit
--                       that contributed to a lead (a prospect can be
--                       found more than once, or by more than one
--                       source). Never edited by a human — this is the
--                       AI's paper trail, kept separate from `ai_leads`
--                       so re-discovering the same lead doesn't clobber
--                       earlier evidence.
--   ai_outreach      — human-in-the-loop outreach drafts. The AI may
--                       INSERT a generated draft here; nothing in this
--                       schema, a trigger, or a default ever flips
--                       `ai_leads.outreach_status` away from
--                       'not_contacted' — that only happens from a plain
--                       admin UPDATE (see apps/admin's actions.ts), which
--                       is the actual guarantee behind "the AI must NEVER
--                       automatically contact a prospect."
--
-- `dedupe_key` is computed in application code (see
-- apps/admin/lib/ai-agent/tools/dedupe.ts — lower(platform) + ':' +
-- lower(username or source_url), whichever identifies the prospect) and
-- upserted via `on conflict (dedupe_key) do update`, NOT a generated
-- column — the exact composition is a product decision that may need to
-- change (e.g. once a real Reddit integration lands and usernames become
-- reliable) without a schema migration every time.
--
-- No secrets live in this schema at all — AI_PROVIDER_API_KEY and every
-- discovery-source credential (e.g. REDDIT_CLIENT_ID/SECRET) stay
-- server-side env vars only, read by apps/admin/lib/ai-agent, never
-- written to any table here.
--
-- Must run after 0006 (is_admin(), set_updated_at()) and 0011 (staff/
-- founder roles — ai_agent_runs.created_by can be any admin-tier user).
-- ============================================================

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

create type public.ai_buying_intent as enum (
  'high',
  'medium',
  'low',
  'none'
);

-- Mirrors this module's spec exactly (section 7) — 'new' is the initial
-- state every inserted lead gets before scoring even finishes;
-- 'qualified'/'possible'/'rejected' are AI-assigned outcomes;
-- everything from 'contacted' onward is admin-assigned only (enforced in
-- apps/admin's server actions, not by a DB constraint, since a human can
-- freely move a lead between these later stages in either direction —
-- e.g. 'negotiation' back to 'lost').
create type public.ai_qualification_status as enum (
  'new',
  'qualified',
  'possible',
  'rejected',
  'contacted',
  'replied',
  'negotiation',
  'converted',
  'lost'
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

  -- What the admin asked for (Find Clients page) — kept as plain columns
  -- rather than one jsonb blob so the Overview/run-history table can
  -- filter/sort on them directly.
  target text not null,
  service_filter text,
  audience_filter text,
  requested_leads integer not null default 20,
  min_lead_score integer not null default 70 check (min_lead_score between 0 and 100),
  sources text[] not null default '{}',

  -- true whenever every source actually used for this run was a demo/mock
  -- provider (packages/db/migrations comment in ai_leads below explains
  -- why this matters for the UI never presenting demo leads as real).
  is_demo boolean not null default true,

  status public.ai_run_status not null default 'pending',

  candidates_found integer not null default 0,
  candidates_analyzed integer not null default 0,
  qualified_leads integer not null default 0,
  rejected_leads integer not null default 0,
  -- Array of { step, message, at } — every tool/pipeline-stage failure
  -- the orchestrator caught along the way, so a run can finish
  -- 'completed' with partial results AND a visible error list, instead
  -- of one opaque top-level failure.
  errors jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_agent_runs_status_idx on public.ai_agent_runs (status);
create index ai_agent_runs_created_at_idx on public.ai_agent_runs (created_at desc);

-- ------------------------------------------------------------------
-- ai_leads
-- ------------------------------------------------------------------

create table public.ai_leads (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_agent_runs (id) on delete set null,

  project_name text,
  prospect_name text,
  username text,
  platform text not null,
  source_url text,
  project_url text,

  -- Free text, not an enum — matched against (but not restricted to) the
  -- taxonomy in apps/admin/lib/ai-agent/knowledge/animation-services.ts.
  -- Kept as text so the knowledge list can grow without a migration.
  detected_service text,
  animation_type text,

  project_description text,
  detected_need text,
  buying_intent public.ai_buying_intent not null default 'none',
  budget_information text,
  deadline_information text,

  lead_score integer not null default 0 check (lead_score between 0 and 100),
  -- { buying_intent: {score,max,reasons[]}, service_fit: {...}, ... } —
  -- see apps/admin/lib/ai-agent/tools/score.ts, the single source of
  -- truth for this shape. Stored (not recomputed on every page view) so
  -- a lead's score explanation stays stable even if the scoring engine's
  -- weights change later.
  score_breakdown jsonb not null default '{}'::jsonb,

  qualification_status public.ai_qualification_status not null default 'new',
  qualification_reason text,
  -- Array of { quote, source_url } — every quote MUST be a verbatim
  -- substring of the source text the discovery tool actually returned
  -- (enforced in application code, see tools/score.ts's own comment on
  -- why evidence is extracted, never generated). Empty array + a
  -- lead_score penalty is how "Insufficient evidence" (spec section 8)
  -- is represented — there is deliberately no separate boolean for it.
  evidence jsonb not null default '[]'::jsonb,

  contact_method text,
  contact_url text,

  discovered_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  outreach_status public.ai_outreach_status not null default 'not_contacted',

  -- Demo-mode leads are clearly and permanently flagged as such — carried
  -- over from ai_agent_runs.is_demo at insert time (denormalized on
  -- purpose) so a lead never silently "becomes real" if a later run
  -- against the SAME dedupe_key happens to use a real source, and the
  -- Leads/Overview UI can filter demo data out with a single column
  -- rather than joining back to ai_agent_runs every time.
  is_demo boolean not null default true,

  -- See this file's own top comment for how this is computed —
  -- application-level upsert key, not a generated column.
  dedupe_key text not null,

  created_at timestamptz not null default now()
);

create unique index ai_leads_dedupe_key_key on public.ai_leads (dedupe_key);
create index ai_leads_source_url_idx on public.ai_leads (source_url);
create index ai_leads_username_idx on public.ai_leads (username);
create index ai_leads_platform_idx on public.ai_leads (platform);
create index ai_leads_lead_score_idx on public.ai_leads (lead_score desc);
create index ai_leads_qualification_status_idx on public.ai_leads (qualification_status);
create index ai_leads_discovered_at_idx on public.ai_leads (discovered_at desc);
create index ai_leads_run_id_idx on public.ai_leads (run_id);

create trigger set_ai_leads_updated_at
  before update on public.ai_leads
  for each row execute function public.set_updated_at();

-- NOTE: set_updated_at() (0001) writes `new.updated_at` — ai_leads uses
-- `last_updated` instead (matching this module's own spec naming), so it
-- gets a tiny dedicated trigger function rather than reusing that one.
create or replace function public.set_ai_lead_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists set_ai_leads_updated_at on public.ai_leads;
create trigger set_ai_leads_last_updated
  before update on public.ai_leads
  for each row execute function public.set_ai_lead_last_updated();

-- ------------------------------------------------------------------
-- ai_lead_sources — append-only evidence/discovery trail
-- ------------------------------------------------------------------

create table public.ai_lead_sources (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.ai_leads (id) on delete cascade,
  discovery_source text not null,
  source_url text,
  raw_snippet text,
  fetched_at timestamptz not null default now()
);

create index ai_lead_sources_lead_id_idx on public.ai_lead_sources (lead_id);

-- ------------------------------------------------------------------
-- ai_outreach — human-in-the-loop draft messages
-- ------------------------------------------------------------------

create table public.ai_outreach (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.ai_leads (id) on delete cascade,

  message text not null,
  is_edited boolean not null default false,
  generated_by_ai boolean not null default true,
  generated_at timestamptz not null default now(),

  -- Purely informational — approving/marking-contacted here does NOT by
  -- itself change ai_leads.outreach_status; apps/admin's actions.ts sets
  -- both explicitly in the same server action so they can never drift,
  -- but the columns stay independent so "who approved this draft" has
  -- its own audit trail even if outreach_status is later changed again
  -- from the Leads page directly.
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_outreach_lead_id_idx on public.ai_outreach (lead_id);

create trigger set_ai_outreach_updated_at
  before update on public.ai_outreach
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- RLS — flat admin-only, same shape as services_admin_write (0006).
-- Nothing in this feature is ever client-visible.
-- ------------------------------------------------------------------

alter table public.ai_agent_runs enable row level security;
alter table public.ai_leads enable row level security;
alter table public.ai_lead_sources enable row level security;
alter table public.ai_outreach enable row level security;

create policy "ai_agent_runs_admin_all" on public.ai_agent_runs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_leads_admin_all" on public.ai_leads
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_lead_sources_admin_all" on public.ai_lead_sources
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ai_outreach_admin_all" on public.ai_outreach
  for all using (public.is_admin()) with check (public.is_admin());
