-- ============================================================
-- 0041: Nimia Creative Agent — creative_agent_sessions
--
-- Backs the homepage's new "Nimia Creative Agent" (studio.nimiagames.com
-- redesign, 13 Agustus 2026): a visitor describes their idea in plain
-- language before ever logging in, the agent (an LLM call, see
-- apps/studio/modules/creative-agent) asks only the clarifying questions
-- that actually affect scope/production/deliverables/pricing/deadline/
-- required assets, and the extracted, structured project data lands here —
-- one row per anonymous browser session, not one row per chat message.
--
-- This migration covers Priorities 1-4 of the brief only (visual +
-- Creative Input + real conversation + structured persistence). Asset
-- upload, the polished Creative Brief view, and linking a confirmed
-- session into `orders` (mirroring modules/order/state/
-- submit-custom-order-action.ts's pattern) are a deliberately separate
-- follow-up phase — `client_id` and `status` below are already shaped for
-- that later work, but nothing in this migration writes to `orders`.
--
-- Access model: RLS is enabled with ZERO policies below, on purpose. There
-- is no signed-in Supabase session for a first-time anonymous visitor, so
-- there is nothing for a client_id-scoped RLS policy to key off (unlike
-- almost every other client-writable table in this schema). Every read/
-- write instead goes through exactly one trusted entry point —
-- app/api/creative-agent/route.ts — using createServiceRoleClient()
-- (packages/db/src/service.ts), which bypasses RLS entirely and does its
-- own authorization by hand: a request may only ever touch the session row
-- whose `session_token` matches its own httpOnly, server-set cookie. With
-- RLS enabled and no policies, `anon`/`authenticated` are denied at the
-- database layer even though Supabase's default schema grants give them
-- table-level privileges — this table is reachable exclusively through
-- that one route, never directly from the browser.
-- ============================================================

create type public.creative_agent_session_status as enum (
  'active',
  'confirmed',
  'abandoned'
);

create table public.creative_agent_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Matches the value stored in the visitor's httpOnly
  -- `creative_agent_session` cookie (crypto.randomUUID(), set by
  -- app/api/creative-agent/route.ts on first message). This, not
  -- client_id, is the real identity of an anonymous conversation.
  session_token uuid not null unique,

  -- Null for the entire scope of this migration — nothing in this phase
  -- authenticates a visitor or links the session to an order. Reserved for
  -- a later phase where a confirmed session is claimed by whichever client
  -- account eventually submits it as an order.
  client_id uuid references public.clients (id) on delete set null,

  status public.creative_agent_session_status not null default 'active',

  -- Full turn-by-turn transcript: [{ role: 'user' | 'assistant', content:
  -- text, at: ISO timestamp }, ...]. Kept verbatim mainly for debugging/
  -- prompt-tuning — `structured_data` below, not this array, is what any
  -- future feature (Brief view, Order submission) should actually read.
  messages jsonb not null default '[]'::jsonb,

  -- The agent's cumulative understanding of the project (brief section 14):
  -- service, project_type, objective, concept, duration, characters, style,
  -- references, platform, deliverables, sound, deadline, budget,
  -- complexity, missing_information. Every field nullable/omittable inside
  -- the JSON — the service layer merges field-by-field on every turn
  -- (never a blind overwrite), so one incomplete AI response can never
  -- erase something already extracted.
  structured_data jsonb not null default '{}'::jsonb,

  -- Safety-cap counter (service enforces MAX_TURNS) — protects the Gemini
  -- free-tier quota from a single runaway/abusive session, not meant as an
  -- analytics field.
  turn_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Set once, the moment the client clicks "Yes, create my brief" on the
  -- Understanding Preview card — a deterministic client action, never
  -- something the AI itself decides (see creative-session.repository.ts's
  -- confirmSession).
  confirmed_at timestamptz
);

create index creative_agent_sessions_session_token_idx
  on public.creative_agent_sessions (session_token);

create index creative_agent_sessions_client_id_idx
  on public.creative_agent_sessions (client_id);

create index creative_agent_sessions_status_idx
  on public.creative_agent_sessions (status);

-- Reuses the shared set_updated_at() helper from 0001_enums_and_users.sql.
create trigger set_creative_agent_sessions_updated_at
  before update on public.creative_agent_sessions
  for each row execute function public.set_updated_at();

alter table public.creative_agent_sessions enable row level security;
-- No policies defined — see this file's header comment. Every access goes
-- through the service-role client in app/api/creative-agent/route.ts.
