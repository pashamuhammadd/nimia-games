-- ============================================================
-- 0035: Discord Partner Program gamification — public leaderboard state
-- + the read-only RPCs the new Discord notifications need.
--
-- Context: the "NIMIA STUDIO — DISCORD PUBLIC COMMUNITY + PARTNER PROGRAM
-- BOT" brief (11 Agustus 2026) adds a public #partner-leaderboard,
-- #recent-rewards, #partner-success, and #partner-joined to the Discord
-- server. This migration does NOT change any Partner Program business
-- logic (levels/commission/reward-release rules from 0016/0030/0033 are
-- untouched) — it only adds the plumbing to READ that existing data
-- safely for public Discord posts, plus one tiny piece of new state: which
-- Discord message IS the current leaderboard post, so the bot can EDIT it
-- in place (brief section 24: "Jangan membuat bot mengirim leaderboard
-- baru setiap kali ada perubahan kecil ... Bot melakukan EDIT terhadap
-- pesan tersebut") instead of spamming a new message every time.
--
-- PREREQUISITE — reads public.partners/partner_referrals/clients (0016,
-- 0025), calls public.is_admin() (0006). Run after 0033.
-- ============================================================

-- ------------------------------------------------------------------
-- discord_leaderboard_state: singleton row (id is always `true`) holding
-- the Discord message id of the ONE pinned leaderboard post in
-- #partner-leaderboard. apps/admin reads this before posting, and writes
-- the (possibly new) message id back after — see
-- packages/discord/src/gamification.ts's postOrUpdateLeaderboard(), which
-- creates a fresh message the first time (message_id is null) and edits
-- the existing one every time after. Deliberately its own tiny table
-- rather than a generic key-value settings table — there's no other
-- cross-app config like this anywhere yet, and this is the only row this
-- system will ever need.
-- ------------------------------------------------------------------
create table public.discord_leaderboard_state (
  id boolean primary key default true,
  constraint discord_leaderboard_state_singleton check (id),
  message_id text,
  updated_at timestamptz not null default now()
);

insert into public.discord_leaderboard_state (id, message_id)
values (true, null)
on conflict (id) do nothing;

alter table public.discord_leaderboard_state enable row level security;

-- Admin-only in both directions — this is internal bot bookkeeping, never
-- read or written by a partner's own session. Only apps/admin's
-- verifyPaymentAction (running as an authenticated admin/staff/founder)
-- ever touches this table.
create policy "discord_leaderboard_state_admin_all" on public.discord_leaderboard_state
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- get_referring_partner_id — given a CLIENT id (not a user id), returns
-- the partner_id who referred them, or null if they weren't referred by
-- anyone. This is the exact same lookup handle_order_paid_partner_reward()
-- (0016) already does internally when a reward is created — exposed here
-- as its own RPC so apps/admin's verifyPaymentAction can look up the
-- SAME partner BEFORE flipping orders.status to 'paid', to snapshot their
-- paid-clients count before the trigger changes it (see
-- get_partner_metrics below — comparing a "before" and "after" call is
-- how level-change / milestone detection works, since
-- partner_paid_clients_count() has no other way to expose a delta).
-- Admin-only (same posture as every other admin-facing RPC in this
-- schema) — verifyPaymentAction is the only caller.
-- ------------------------------------------------------------------
create or replace function public.get_referring_partner_id(p_client_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized to look up referring partners';
  end if;

  select pr.partner_id into v_partner_id
  from public.partner_referrals pr
  join public.clients c on c.user_id = pr.referred_user_id
  where c.id = p_client_id
  limit 1;

  return v_partner_id;
end;
$$;

grant execute on function public.get_referring_partner_id(uuid) to authenticated;

-- ------------------------------------------------------------------
-- get_partner_discord_profile — the small set of fields the new Discord
-- notifications (reward earned / level changed) need to identify a
-- partner publicly: their site display name, the two level-affecting
-- flags (is_founding_partner, joined_via_partner_page — level itself
-- stays derived in TypeScript via resolvePartnerLevelDisplay, NOT
-- recomputed here, so this migration doesn't become a 4th place the
-- Bronze/Silver/Gold/Platinum thresholds live — see 0016's own comment on
-- why there's already 3), and their Discord handle if they've connected
-- one (0025). Same owner-or-admin auth shape as get_partner_metrics
-- (0016/0033) — reused here rather than widened, since a partner's own
-- session has no reason to call this (it's for the admin-triggered
-- Discord notification path only, but kept owner-readable too for
-- consistency with every other per-partner RPC in this schema).
-- ------------------------------------------------------------------
create or replace function public.get_partner_discord_profile(p_partner_id uuid)
returns table (
  full_name text,
  is_founding_partner boolean,
  joined_via_partner_page boolean,
  discord_user_id text,
  discord_username text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.partners
    where id = p_partner_id and (user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized to read this partner''s profile';
  end if;

  return query
  select u.full_name, p.is_founding_partner, p.joined_via_partner_page, c.discord_user_id, c.discord_username
  from public.partners p
  join public.users u on u.id = p.user_id
  join public.clients c on c.user_id = p.user_id
  where p.id = p_partner_id;
end;
$$;

grant execute on function public.get_partner_discord_profile(uuid) to authenticated;

-- ------------------------------------------------------------------
-- get_partner_leaderboard_public — top N partners ranked by successful
-- paid referrals (brief section 13: "Leaderboard harus menggunakan:
-- SUCCESSFUL PAID REFERRALS ... JANGAN menggunakan: registration count"),
-- for #partner-leaderboard. Deliberately returns NO dollar figures (per
-- user decision, 11 Agustus 2026) and nothing beyond what's already safe
-- to show publicly elsewhere in this app (display name, level-affecting
-- flags, Discord handle if connected) — never email/wallet/order data.
-- Filters to role = 'client' (same as get_all_partners_admin, 0028) so
-- internal staff/admin/founder accounts — which also get an automatic
-- partners row per 0016's signup trigger — never appear on a PUBLIC
-- leaderboard. Also filters out partners with zero paid referrals: an
-- empty leaderboard row for someone who hasn't referred anyone yet isn't
-- meaningful social proof, it's just noise. Admin-only caller (apps/admin
-- posts this to Discord, same as every other new RPC in this migration) —
-- there's no reason for a partner's own browser session to call this
-- directly, the Discord message is the public surface for it.
-- ------------------------------------------------------------------
create or replace function public.get_partner_leaderboard_public(p_limit integer default 10)
returns table (
  partner_id uuid,
  full_name text,
  is_founding_partner boolean,
  joined_via_partner_page boolean,
  paid_clients_count integer,
  discord_user_id text,
  discord_username text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to read the public partner leaderboard';
  end if;

  return query
  select
    p.id,
    u.full_name,
    p.is_founding_partner,
    p.joined_via_partner_page,
    public.partner_paid_clients_count(p.id),
    c.discord_user_id,
    c.discord_username
  from public.partners p
  join public.users u on u.id = p.user_id
  join public.clients c on c.user_id = p.user_id
  where u.role = 'client'
    and public.partner_paid_clients_count(p.id) > 0
  order by public.partner_paid_clients_count(p.id) desc, p.created_at asc
  limit p_limit;
end;
$$;

grant execute on function public.get_partner_leaderboard_public(integer) to authenticated;
