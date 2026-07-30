-- ============================================================
-- 0013: negotiation, crypto payments, and ambassador/referral schema
--
-- Implements docs/ARCHITECTURE.md's Tahap 5 design: price negotiation log,
-- company crypto wallets (Phase 1: Ethereum/BSC/Tron per section 5),
-- per-order payment fields, the ambassador application -> approval ->
-- referral -> commission pipeline, and the RLS + helper functions all of
-- that needs.
--
-- IMPORTANT — run this AFTER 0011 and 0012 have each been committed on
-- their own (separate "Run"s) — this file uses the 'staff'/'founder' and
-- new order_status enum values added there.
-- ============================================================

-- ------------------------------------------------------------------
-- orders: negotiation + crypto payment columns
-- ------------------------------------------------------------------

alter table public.orders
  add column proposed_price_usd numeric(12, 2),
  add column final_price_usd numeric(12, 2),
  add column payment_network text,
  add column payment_token text,
  add column payment_wallet_address text,
  add column payment_expected_amount numeric(18, 8),
  add column payment_tx_hash text,
  add column payment_submitted_at timestamptz,
  add column payment_verified_by uuid references public.users (id) on delete set null,
  add column payment_verified_at timestamptz,
  add column payment_underpaid_note text;

-- ------------------------------------------------------------------
-- order_negotiations: every offer/counter-offer, not a single overwritten
-- field, since a price can go back and forth multiple rounds.
-- ------------------------------------------------------------------

create table public.order_negotiations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  proposed_by text not null check (proposed_by in ('client', 'staff')),
  amount_usd numeric(12, 2) not null,
  message text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- payment_wallets: company wallet addresses per network, admin-managed
-- (not hardcoded) so an address can be rotated without a deploy. Phase 1
-- (docs/ARCHITECTURE.md section 5): Ethereum, BSC, Tron only — Solana and
-- Cardano are Phase 2, added later as new rows with zero schema change
-- (the enum already lists all 5 so that later addition needs no ALTER
-- TYPE at all).
-- ------------------------------------------------------------------

create type public.crypto_network as enum ('ethereum', 'bsc', 'tron', 'solana', 'cardano');

create table public.payment_wallets (
  id uuid primary key default gen_random_uuid(),
  network public.crypto_network not null,
  address text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Phase 1 seed — PLACEHOLDER addresses. These MUST be replaced with your
-- real company wallet addresses before any buyer can actually pay — left
-- as an obvious placeholder string rather than blank so it can't be
-- missed or accidentally left live.
insert into public.payment_wallets (network, address, is_active)
values
  ('ethereum', '0xPLACEHOLDER_REPLACE_ME', true),
  ('bsc', '0xPLACEHOLDER_REPLACE_ME', true),
  ('tron', 'TPLACEHOLDER_REPLACE_ME', true);

-- ------------------------------------------------------------------
-- ambassador program
-- ------------------------------------------------------------------

create table public.ambassador_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  telegram text,
  discord_username text,
  wallet_address text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ambassadors: created once an application is approved. commission_rate is
-- LOCKED at approval time (0.10 for the first 100 approved ambassadors,
-- 0.05 after — see docs/ARCHITECTURE.md section 2) rather than
-- recalculated later, so ambassadors approved before the 100-quota fills
-- stay at 10% forever per the agreed terms.
create table public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  referral_code text not null unique,
  commission_rate numeric(4, 3) not null,
  founding_member boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id) on delete cascade,
  referred_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- commissions: one row per order that came from a referral, created
-- automatically (trigger below) the moment that order's status becomes
-- 'paid'.
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_usd numeric(12, 2) not null,
  rate_applied numeric(4, 3) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  paid_tx_reference text,
  created_at timestamptz not null default now()
);

-- Auto-create a commissions row when an order transitions to 'paid', IF
-- the buyer behind that order was referred by an ambassador (has a row in
-- `referrals`). Mirrors the pattern already used by
-- log_project_status_change (0003) and handle_payment_verified (0005).
create or replace function public.handle_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ambassador_id uuid;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select r.ambassador_id into v_ambassador_id
    from public.clients c
    join public.referrals r on r.referred_user_id = c.user_id
    where c.id = new.client_id
    limit 1;

    if v_ambassador_id is not null and new.final_price_usd is not null then
      insert into public.commissions (ambassador_id, order_id, amount_usd, rate_applied)
      select v_ambassador_id, new.id, new.final_price_usd * a.commission_rate, a.commission_rate
      from public.ambassadors a
      where a.id = v_ambassador_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_after_paid
  after update on public.orders
  for each row execute function public.handle_order_paid();

-- ------------------------------------------------------------------
-- Role helpers — is_admin() is redefined to mean "admin OR staff OR
-- founder" (kept under its ORIGINAL name so every existing policy written
-- against it in 0006 keeps working with zero edits) plus a NEW
-- is_founder() for the finance-only surfaces in apps/admin.
-- ------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'staff', 'founder')
  );
$$;

create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'founder'
  );
$$;

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------

alter table public.order_negotiations enable row level security;
alter table public.payment_wallets enable row level security;
alter table public.ambassador_applications enable row level security;
alter table public.ambassadors enable row level security;
alter table public.referrals enable row level security;
alter table public.commissions enable row level security;

-- order_negotiations — same "owner client or admin/staff/founder" shape
-- as messages (0006).
create policy "order_negotiations_select_own_or_admin" on public.order_negotiations
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_negotiations.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

create policy "order_negotiations_insert_own_or_admin" on public.order_negotiations
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_negotiations.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

-- Lets the OWNING CLIENT move their own order from 'awaiting_payment' to
-- 'payment_submitted' (submitting a tx hash) without needing full
-- admin-only update rights on orders. Additive — Postgres combines
-- multiple permissive UPDATE policies with OR, so this does not weaken
-- orders_update_admin_only (0006) at all, it only opens this one narrow
-- transition to the order's own client.
create policy "orders_update_own_payment_submission" on public.orders
  for update
  using (public.is_owner_client(client_id) and status = 'awaiting_payment')
  with check (public.is_owner_client(client_id) and status = 'payment_submitted');

-- payment_wallets — public can read ACTIVE wallets (a buyer needs the
-- address to know where to send payment), only admin/staff/founder manage
-- them.
create policy "payment_wallets_public_read_active" on public.payment_wallets
  for select using (is_active or public.is_admin());

create policy "payment_wallets_admin_write" on public.payment_wallets
  for all using (public.is_admin()) with check (public.is_admin());

-- ambassador_applications — anyone (including an anonymous visitor
-- filling out /ambassador/apply) can submit an application; only
-- admin/staff/founder can read/review them.
create policy "ambassador_applications_public_insert" on public.ambassador_applications
  for insert with check (true);

create policy "ambassador_applications_admin_read" on public.ambassador_applications
  for select using (public.is_admin());

create policy "ambassador_applications_admin_write" on public.ambassador_applications
  for update using (public.is_admin()) with check (public.is_admin());

-- ambassadors — an ambassador can read their own row (for their Referrals
-- page in apps/studio); admin/staff/founder see all.
create policy "ambassadors_select_own_or_admin" on public.ambassadors
  for select using (user_id = auth.uid() or public.is_admin());

create policy "ambassadors_admin_write" on public.ambassadors
  for all using (public.is_admin()) with check (public.is_admin());

-- referrals — an ambassador can see who they referred; admin/staff/founder
-- see everything.
create policy "referrals_select_own_or_admin" on public.referrals
  for select using (
    exists (
      select 1 from public.ambassadors
      where ambassadors.id = referrals.ambassador_id
        and ambassadors.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "referrals_admin_write" on public.referrals
  for all using (public.is_admin()) with check (public.is_admin());

-- commissions — same ownership shape as referrals; only the trigger above
-- and admin/staff/founder ever write here.
create policy "commissions_select_own_or_admin" on public.commissions
  for select using (
    exists (
      select 1 from public.ambassadors
      where ambassadors.id = commissions.ambassador_id
        and ambassadors.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "commissions_admin_write" on public.commissions
  for all using (public.is_admin()) with check (public.is_admin());
