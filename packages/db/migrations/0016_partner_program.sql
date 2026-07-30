-- ============================================================
-- 0016: Nimia Partner Program — real schema, replacing mock data,
-- and MERGING the old Ambassador Program (0013) into one system.
--
-- Context: apps/studio/modules/partners/ shipped UI-first with a mock
-- repository (30 Juli 2026). The user has now confirmed:
--   1. Merge the old apply-then-approve Ambassador Program
--      (ambassador_applications / ambassadors / referrals / commissions,
--      from 0013) into this new SELF-SERVE Partner Program (every account
--      gets a referral code automatically, no application/approval step).
--   2. Reward/commission calculation should be REAL and automatic, not a
--      UI placeholder — mirrors the design 0013 already established for
--      handle_order_paid(), extended with a release step (see below).
--
-- PREREQUISITE — this migration reads/renames public.ambassadors,
-- public.referrals, public.commissions (0013), uses the 'staff'/'founder'
-- roles (0011), and the 'paid' order_status value (0012). It WILL FAIL
-- with "relation/value does not exist" if 0011 through 0015 have not all
-- already been run against this Supabase project — run those first (in
-- order) if you haven't yet, then this one.
--
-- IMPORTANT — run this file BY ITSELF, as one script, same as 0013-0015
-- (no new enum values are added here, so there's no Postgres
-- same-transaction restriction forcing a split — but running it as a
-- single paste-and-Run in the Supabase SQL editor, like every other file
-- in this folder, keeps the whole migration atomic).
-- ============================================================

-- ------------------------------------------------------------------
-- partners: one row per public.users row, auto-created by
-- handle_new_auth_user() (extended below) — never inserted directly by
-- app code or by any RLS insert policy, same "trusted trigger only"
-- pattern as public.users/public.clients (see 0001/0002's comments).
--
-- Deliberately does NOT store paid_clients_count / current_level /
-- commission_rate as columns: those are all DERIVED (via
-- partner_paid_clients_count()/partner_commission_rate() below) so there
-- is exactly one source of truth for the level ladder — the same
-- thresholds also live in
-- apps/studio/modules/partners/constants/partner-level.ts for the
-- TypeScript side's own level/progress-bar math. **If you ever change the
-- Bronze/Silver/Gold/Platinum thresholds or commission rates, update BOTH
-- partner_commission_rate() below AND that TypeScript file — nothing
-- keeps them in sync automatically.**
-- ------------------------------------------------------------------

create sequence public.partner_founding_seq;

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  referral_code text not null unique,
  is_founding_partner boolean not null default false,
  -- 1-based join order among the first 100 accounts ever, NULL for
  -- everyone after the quota fills. Comes from partner_founding_seq, which
  -- counts EVERY partner ever created (founding or not) so the "has the
  -- quota filled yet" check stays correct.
  founding_partner_number integer unique,
  created_at timestamptz not null default now()
);

-- partner_referrals: who signed up using whose code. `referred_user_id` is
-- UNIQUE — a person can only ever be credited to ONE partner (the first
-- valid code they registered with), matching the brief's "REFERRAL LINK"
-- section (code applies once, permanently, at account creation).
create table public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  referred_user_id uuid not null unique references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index partner_referrals_partner_id_idx on public.partner_referrals (partner_id);

-- partner_rewards: one row per order that earned a partner a reward —
-- ledger style (never mutate amount_usd/rate_applied after insert),
-- mirroring how 0013's `commissions` table worked. `status` has only two
-- values because there's still no withdraw/payout system (brief: "Belum
-- perlu membuat sistem withdraw"):
--   'pending'   — the referred client's order was marked paid, but the
--                 project isn't finished yet (could theoretically still
--                 be cancelled/disputed mid-production).
--   'available' — the project for that order reached 'completed'. Reward
--                 is considered fully earned and safe to show as
--                 available — there's still no withdraw button, this only
--                 changes which of the 3 UI buckets it's counted in.
-- This "wait for project completion" rule is an assumption made for this
-- migration (the brief didn't specify an exact release rule) — tell
-- Claude if you want a different one (e.g. a fixed N-day hold instead).
create table public.partner_rewards (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  amount_usd numeric(12, 2) not null,
  rate_applied numeric(4, 3) not null,
  status text not null default 'pending' check (status in ('pending', 'available')),
  available_at timestamptz,
  created_at timestamptz not null default now()
);

create index partner_rewards_partner_id_idx on public.partner_rewards (partner_id);

-- ------------------------------------------------------------------
-- Functions
-- ------------------------------------------------------------------

-- 8-char code generator. Charset MUST match
-- apps/studio/modules/partners/utils/generate-referral-code.ts's
-- REFERRAL_CODE_CHARSET exactly (excludes O, 0, I, 1, L — ambiguous
-- characters). Loops until it finds a code not already in `partners`;
-- collisions are astronomically unlikely at this charset/length (23*10
-- possibilities in position 1 alone) but checked anyway since "Selalu
-- unik" (always unique) is an explicit brief requirement, not just a
-- nice-to-have.
create or replace function public.generate_partner_referral_code()
returns text
language plpgsql
as $$
declare
  v_charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
  i integer;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 1);
    end loop;
    select exists(select 1 from public.partners where referral_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- Real "Paid Clients" count — distinct referred clients with at least one
-- order at status = 'paid'. Deliberately DISTINCT on client, not a count
-- of paid orders, so a repeat client only ever counts once toward level.
create or replace function public.partner_paid_clients_count(p_partner_id uuid)
returns integer
language sql
stable
as $$
  select count(distinct o.client_id)::integer
  from public.partner_referrals pr
  join public.clients c on c.user_id = pr.referred_user_id
  join public.orders o on o.client_id = c.id
  where pr.partner_id = p_partner_id
    and o.status = 'paid';
$$;

-- Commission rate ladder. KEEP IN SYNC with PARTNER_LEVELS in
-- apps/studio/modules/partners/constants/partner-level.ts — see that
-- file's own header comment, which points back here.
create or replace function public.partner_commission_rate(p_paid_clients_count integer, p_is_founding_partner boolean)
returns numeric
language sql
immutable
as $$
  select case
    when p_is_founding_partner then 0.10 -- Founding Partner override: instant/lifetime Gold rate, regardless of paid_clients_count.
    when p_paid_clients_count >= 15 then 0.12 -- Platinum
    when p_paid_clients_count >= 7 then 0.10  -- Gold
    when p_paid_clients_count >= 3 then 0.07  -- Silver
    else 0.05                                  -- Bronze
  end;
$$;

-- RPC (security definer — bypasses RLS internally, so it must check
-- authorization itself): everything the Partners dashboard page needs
-- about ONE partner's aggregate numbers, in a single round trip. Only the
-- partner themselves or an admin/staff/founder may call this for a given
-- partner_id — since this function reaches across partner_referrals/
-- partner_rewards/orders/clients (tables an ordinary partner has no
-- direct RLS access to), the check below is the ONLY thing standing
-- between a partner and reading another partner's private numbers, so
-- don't remove it even though it looks redundant with table RLS.
create or replace function public.get_partner_metrics(p_partner_id uuid)
returns table (
  referral_count bigint,
  paid_clients_count integer,
  pending_reward_usd numeric,
  available_reward_usd numeric,
  lifetime_reward_usd numeric
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
    raise exception 'not authorized to read metrics for this partner';
  end if;

  return query
  select
    (select count(*) from public.partner_referrals where partner_id = p_partner_id),
    public.partner_paid_clients_count(p_partner_id),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id and status = 'pending'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id and status = 'available'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id), 0);
end;
$$;

-- RPC: the Referral Activity table's rows for one partner — referred
-- person's name, their most recent order's status (used by
-- apps/studio/modules/partners/utils/derive-referral-status.ts to map
-- onto the brief's 4 UI states), and total reward earned from them so
-- far. Same "must check authorization itself" note as get_partner_metrics
-- above applies here.
create or replace function public.get_partner_referral_activity(p_partner_id uuid)
returns table (
  referral_id uuid,
  referred_name text,
  order_status text,
  reward_usd numeric,
  created_at timestamptz
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
    raise exception 'not authorized to read referral activity for this partner';
  end if;

  return query
  select
    pr.id,
    u.full_name,
    (
      select o.status::text
      from public.orders o
      join public.clients c on c.id = o.client_id
      where c.user_id = pr.referred_user_id
      order by o.created_at desc
      limit 1
    ),
    coalesce((
      select sum(rw.amount_usd)
      from public.partner_rewards rw
      join public.orders ro on ro.id = rw.order_id
      join public.clients rc on rc.id = ro.client_id
      where rc.user_id = pr.referred_user_id and rw.partner_id = p_partner_id
    ), 0),
    pr.created_at
  from public.partner_referrals pr
  join public.users u on u.id = pr.referred_user_id
  where pr.partner_id = p_partner_id
  order by pr.created_at desc;
end;
$$;

-- ------------------------------------------------------------------
-- Backfill: every EXISTING user gets a partners row, numbered by their
-- REAL original signup order (created_at) — not by migration-run order —
-- so "first 100 partners" reflects actual history.
-- ------------------------------------------------------------------

do $$
declare
  v_user record;
  v_rn bigint := 0;
begin
  for v_user in select id from public.users order by created_at loop
    v_rn := v_rn + 1;
    insert into public.partners (user_id, referral_code, is_founding_partner, founding_partner_number, created_at)
    select v_user.id, public.generate_partner_referral_code(), v_rn <= 100, case when v_rn <= 100 then v_rn end, now()
    where not exists (select 1 from public.partners where user_id = v_user.id);
  end loop;

  -- Continue the sequence from where the backfill left off, so the next
  -- brand-new signup's founding_partner_number picks up correctly instead
  -- of restarting at 1.
  perform setval('public.partner_founding_seq', greatest(v_rn, 1), true);
end;
$$;

-- ------------------------------------------------------------------
-- Merge old Ambassador Program data into the new tables, THEN rename the
-- old tables (not DROP — keeps the data for audit/rollback, just out of
-- the app's way).
-- ------------------------------------------------------------------

-- Carry over each existing ambassador's REAL referral_code and founding
-- status onto the partners row the backfill above just created for that
-- same user — so any already-shared old ambassador referral links keep
-- working under the new system instead of silently becoming invalid.
update public.partners p
set referral_code = a.referral_code,
    is_founding_partner = a.founding_member
from public.ambassadors a
where p.user_id = a.user_id;

insert into public.partner_referrals (partner_id, referred_user_id, created_at)
select p.id, r.referred_user_id, r.created_at
from public.referrals r
join public.ambassadors a on a.id = r.ambassador_id
join public.partners p on p.user_id = a.user_id
on conflict (referred_user_id) do nothing;

-- Old commission status 'paid' meant "admin already paid this ambassador
-- out" — there's no equivalent "withdrawn" bucket in the new 3-bucket
-- model yet (still no payout system), so the closest honest mapping is
-- 'available'. NOTE: if any of these were truly already paid out to a
-- real ambassador, this will overstate their "Available Reward" until a
-- withdrawn/paid-out column is added in a future payout-system migration
-- — a known, deliberate limitation, not an oversight. Also note: unlike
-- the old `commissions` table, `partner_rewards.order_id` is UNIQUE — if
-- old `commissions` ever somehow had two rows for the same order_id
-- (shouldn't happen given handle_order_paid()'s old status-transition
-- guard, but not schema-enforced back then), only the first one migrates
-- and the rest are silently skipped by `on conflict do nothing`.
insert into public.partner_rewards (partner_id, order_id, amount_usd, rate_applied, status, available_at, created_at)
select
  p.id,
  c.order_id,
  c.amount_usd,
  c.rate_applied,
  case when c.status = 'paid' then 'available' else 'pending' end,
  case when c.status = 'paid' then c.paid_at else null end,
  c.created_at
from public.commissions c
join public.ambassadors a on a.id = c.ambassador_id
join public.partners p on p.user_id = a.user_id
on conflict (order_id) do nothing;

-- Superseded by handle_order_paid_partner_reward() below, which does the
-- same job against the new tables — drop before renaming ambassadors/
-- referrals/commissions, since this trigger would otherwise break the
-- next time an order is marked paid (it references those table names
-- directly).
drop trigger if exists orders_after_paid on public.orders;
drop function if exists public.handle_order_paid();

alter table public.ambassadors rename to ambassadors_legacy;
alter table public.referrals rename to referrals_legacy;
alter table public.commissions rename to commissions_legacy;

comment on table public.ambassadors_legacy is 'DEPRECATED 30 Juli 2026 (migration 0016) — merged into public.partners. Kept for audit/rollback only, no longer read by the app.';
comment on table public.referrals_legacy is 'DEPRECATED 30 Juli 2026 (migration 0016) — merged into public.partner_referrals. Kept for audit/rollback only.';
comment on table public.commissions_legacy is 'DEPRECATED 30 Juli 2026 (migration 0016) — merged into public.partner_rewards. Kept for audit/rollback only.';
comment on table public.ambassador_applications is 'DEPRECATED 30 Juli 2026 (migration 0016) — Nimia Partner Program is self-serve (every account gets a partner row automatically), no application/approval step needed anymore. Kept for historical read only.';

-- ------------------------------------------------------------------
-- Extend handle_new_auth_user() (0006, extended again in 0007) to also
-- auto-provision a partners row, and to record a referral if this signup
-- came through one (RegisterForm's optional "Referral Code" field,
-- forwarded as signUp() metadata by app/actions.ts's signUpAction — see
-- that file's comment). Safe to run multiple times, same as 0007: this
-- just repoints the existing on_auth_user_created trigger (from 0006) at
-- a new function body.
-- ------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founding_number bigint;
  v_new_referral_code text;
  v_input_referral_code text;
  v_referrer_partner_id uuid;
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.clients (user_id, company_name, whatsapp, country)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
    nullif(new.raw_user_meta_data ->> 'country', '')
  );

  -- Nimia Partner Program: every account gets a partner row + permanent
  -- referral code automatically, no application step.
  v_founding_number := nextval('public.partner_founding_seq');
  v_new_referral_code := public.generate_partner_referral_code();

  insert into public.partners (user_id, referral_code, is_founding_partner, founding_partner_number)
  values (
    new.id,
    v_new_referral_code,
    v_founding_number <= 100,
    case when v_founding_number <= 100 then v_founding_number end
  );

  -- If this signup came through a referral link/code, record it. A
  -- missing/invalid/self-referenced code is silently ignored — it should
  -- never block signup.
  v_input_referral_code := upper(trim(new.raw_user_meta_data ->> 'referral_code'));
  if v_input_referral_code is not null and v_input_referral_code <> '' then
    select id into v_referrer_partner_id
    from public.partners
    where referral_code = v_input_referral_code and user_id <> new.id;

    if v_referrer_partner_id is not null then
      insert into public.partner_referrals (partner_id, referred_user_id)
      values (v_referrer_partner_id, new.id)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Reward automation — same trigger POINT as the old handle_order_paid()
-- (orders.status transitioning to 'paid'), against the new tables.
-- ------------------------------------------------------------------

create or replace function public.handle_order_paid_partner_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_is_founding boolean;
  v_paid_clients_count integer;
  v_rate numeric;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select pr.partner_id into v_partner_id
    from public.partner_referrals pr
    join public.clients c on c.user_id = pr.referred_user_id
    where c.id = new.client_id
    limit 1;

    if v_partner_id is not null and new.final_price_usd is not null then
      select is_founding_partner into v_is_founding from public.partners where id = v_partner_id;
      -- Counted AFTER this order counts as paid (we're in an AFTER UPDATE
      -- trigger, so this row is already visible to the same-transaction
      -- query below) — a client's FIRST paid order can push the referring
      -- partner up a level in the same instant their reward is created.
      v_paid_clients_count := public.partner_paid_clients_count(v_partner_id);
      v_rate := public.partner_commission_rate(v_paid_clients_count, v_is_founding);

      insert into public.partner_rewards (partner_id, order_id, amount_usd, rate_applied, status)
      values (v_partner_id, new.id, new.final_price_usd * v_rate, v_rate, 'pending')
      on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_after_paid_partner_reward
  after update on public.orders
  for each row execute function public.handle_order_paid_partner_reward();

-- Release step: once the PROJECT tied to a rewarded order reaches
-- 'completed', flip that reward from 'pending' to 'available' (see
-- partner_rewards table comment above for the reasoning).
create or replace function public.handle_project_completed_partner_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.order_id is not null then
    update public.partner_rewards
    set status = 'available', available_at = now()
    where order_id = new.order_id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger projects_after_completed_partner_reward
  after update on public.projects
  for each row execute function public.handle_project_completed_partner_reward();

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------

alter table public.partners enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_rewards enable row level security;

-- No insert/update policy for regular users on any of the 3 tables below
-- — every row is created by the security-definer trigger functions above,
-- same "trusted trigger only" shape as public.users/public.clients.

create policy "partners_select_own_or_admin" on public.partners
  for select using (user_id = auth.uid() or public.is_admin());

create policy "partners_admin_write" on public.partners
  for all using (public.is_admin()) with check (public.is_admin());

create policy "partner_referrals_select_own_or_admin" on public.partner_referrals
  for select using (
    exists (
      select 1 from public.partners
      where partners.id = partner_referrals.partner_id and partners.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "partner_referrals_admin_write" on public.partner_referrals
  for all using (public.is_admin()) with check (public.is_admin());

create policy "partner_rewards_select_own_or_admin" on public.partner_rewards
  for select using (
    exists (
      select 1 from public.partners
      where partners.id = partner_rewards.partner_id and partners.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "partner_rewards_admin_write" on public.partner_rewards
  for all using (public.is_admin()) with check (public.is_admin());
