-- ============================================================
-- 0055: Telegram Business Sales Assistant — leads + connection state +
-- webhook idempotency. See docs/TELEGRAM_BUSINESS_BOT.md for the full
-- architecture writeup (audit + Telegram Business Bot API research, 20
-- Agustus 2026). Deliberately UNRELATED to 0054_telegram_account_linking
-- (the client-facing Mini App bot) — that migration links Telegram users
-- to EXISTING `clients` rows; this one is about PROSPECTS who have not
-- signed up at all yet, captured from Pasha's own Telegram Business
-- inbox. No `clients` row exists for most of these people, so this data
-- deliberately does NOT live on `clients` the way 0025/0054 do.
--
-- Same "website/database = single source of truth, bot is a thin
-- gateway" principle as Discord (docs/DISCORD.md) and the Mini App bot
-- (docs/TELEGRAM.md) — no separate persistent process, everything here
-- is written by a single serverless webhook route
-- (apps/miniapp/app/api/telegram/business/webhook/route.ts).
-- ============================================================

-- ------------------------------------------------------------------
-- telegram_business_connections
-- ------------------------------------------------------------------
--
-- One row per Telegram "Business Connection" — Telegram sends a fresh
-- `business_connection` update (with a NEW connection_id) any time Pasha
-- connects, disconnects, or edits this bot's permissions in his own
-- Telegram Business settings. Storing this (rather than a static env
-- var for "Pasha's Telegram user id") means the bot is fully
-- self-configuring the moment Pasha connects it — nothing to hardcode,
-- and it keeps working unmodified if Pasha ever has to reconnect (a
-- fresh connection_id, same telegram_user_id). `telegram_user_id` here
-- is the BUSINESS ACCOUNT OWNER (Pasha), never a prospect — this is how
-- the webhook tells "a message from Pasha himself" (human takeover, see
-- app/lib/business-bot/conversation.ts) apart from "a message from a
-- prospective client" without any manual config.
create table public.telegram_business_connections (
  connection_id text primary key,
  telegram_user_id text not null,
  is_enabled boolean not null default true,
  can_reply boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.telegram_business_connections is
  'Live state of Pasha''s Telegram Business Connection(s), synced from every business_connection webhook update. telegram_user_id is the connection OWNER (Pasha), used to detect human-takeover (a business_message whose from.id matches this row''s telegram_user_id means Pasha typed it himself, not the bot) and as the target for admin notifications (notifyNewLead sends a PLAIN sendMessage here, never via business_connection_id, so it never leaks into the prospect''s own chat thread).';

alter table public.telegram_business_connections enable row level security;

-- Same shape as email_logs_admin_only (0006) — internal state, never
-- shown to a client/prospect, no public read path needed at all.
create policy "telegram_business_connections_admin_only" on public.telegram_business_connections
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- telegram_business_leads
-- ------------------------------------------------------------------
--
-- One row per prospective client who has messaged Pasha's Business
-- account through this bot. Deliberately NOT a `clients` row — most of
-- these people will never sign up on the website at all; this is a
-- standalone qualification record for Pasha to review, matching the
-- brief's own "Lead" data shape 1:1 (telegram_user_id / username /
-- first_name / last_name / service / service_subtype /
-- project_description / expected_budget / status / bot_status / source
-- / created_at / updated_at / human_takeover_at, plus last_message).
create table public.telegram_business_leads (
  id uuid primary key default gen_random_uuid(),

  telegram_user_id text not null,
  telegram_username text,
  first_name text,
  last_name text,
  -- Which business connection this lead's conversation is happening
  -- under — a foreign key rather than a bare copy, so a disabled/stale
  -- connection is discoverable via a join rather than silently trusted.
  business_connection_id text not null references public.telegram_business_connections (connection_id),

  service text,
  service_subtype text,
  project_description text,
  expected_budget text,

  -- Conversation status (the brief's own "status" field, distinct from
  -- bot_status below) — the state-machine step this lead's conversation
  -- is currently at. Free text, not an enum: app/lib/business-bot/conversation.ts
  -- owns the actual set of valid values (menu, animation_menu,
  -- awaiting_brief, awaiting_budget, completed) so adding a new step
  -- later never needs a migration.
  status text not null default 'menu',

  -- BOT_ACTIVE | HUMAN_ACTIVE | WAITING_FOR_HUMAN | COMPLETED — see
  -- app/lib/business-bot/service.ts's pauseBot/resumeBot/
  -- takeOverConversation/releaseConversation (brief point 11). The bot
  -- only ever auto-replies to a prospect's message when this is
  -- BOT_ACTIVE; every other value means "stay silent for this lead".
  bot_status text not null default 'BOT_ACTIVE',

  source text not null default 'telegram_business',
  last_message text,
  human_takeover_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.telegram_business_leads.status is
  'Conversation state-machine step (menu / animation_menu / awaiting_brief / awaiting_budget / completed) — see app/lib/business-bot/conversation.ts. Distinct from bot_status: this tracks WHERE the qualification flow is, bot_status tracks WHO is allowed to reply right now.';

comment on column public.telegram_business_leads.bot_status is
  'BOT_ACTIVE | HUMAN_ACTIVE | WAITING_FOR_HUMAN | COMPLETED. Set to HUMAN_ACTIVE the instant a business_message arrives whose from.id matches this lead''s connection owner (Pasha typed it himself) — there is no such event from Telegram itself, this is detected by the webhook on every inbound business_message (see docs/TELEGRAM_BUSINESS_BOT.md §5).';

-- One active lead conversation per prospect — a second /start-equivalent
-- contact from the same Telegram user continues the SAME row (via
-- ON CONFLICT upsert in app/lib/business-bot/leads.ts) rather than
-- creating a duplicate, so Pasha never sees the same person as two
-- separate leads.
create unique index telegram_business_leads_telegram_user_id_key
  on public.telegram_business_leads (telegram_user_id);

alter table public.telegram_business_leads enable row level security;

create policy "telegram_business_leads_admin_only" on public.telegram_business_leads
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- telegram_business_processed_updates
-- ------------------------------------------------------------------
--
-- Idempotency guard (brief's own security requirement, point 20:
-- "Duplicate Telegram updates ditangani... Idempotency digunakan untuk
-- mencegah double response"). Telegram redelivers an update if the
-- webhook doesn't return 200 fast enough, or as a general at-least-once
-- delivery guarantee — without this, a slow response or a transient
-- error after a message was already sent could make the bot answer the
-- same prospect message twice. The webhook route inserts the incoming
-- `update_id` FIRST (before doing any work); a unique-violation on that
-- insert means "already handled", and the route returns 200 immediately
-- without reprocessing.
create table public.telegram_business_processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

comment on table public.telegram_business_processed_updates is
  'Idempotency guard for the Business Assistant webhook — one row per Telegram update_id already handled. A unique-violation on insert means "duplicate delivery, skip". No RLS needed (nothing here is ever meaningful outside the webhook''s own service-role client), but enabled anyway for consistency with every other table in this schema.';

alter table public.telegram_business_processed_updates enable row level security;

create policy "telegram_business_processed_updates_admin_only" on public.telegram_business_processed_updates
  for all using (public.is_admin()) with check (public.is_admin());
