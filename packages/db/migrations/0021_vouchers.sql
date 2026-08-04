-- ============================================================
-- 0021: Vouchers — percentage discount codes redeemable on an order
--
-- Part of the "Vouchers & Quests" feature (P1, 4 Agustus 2026): a client
-- can hold a voucher (assigned personally by admin, earned as a Quest
-- reward, or a public promo code) and apply it to an order that's
-- currently `awaiting_payment`, reducing `final_price_usd` by a
-- percentage before they pick a network/currency to pay.
--
-- Design follows the pattern this codebase's own P0.5 security audit
-- confirmed as safe: no RLS policy lets a client directly UPDATE/INSERT a
-- row that affects redemption counts or order pricing. The only door in is
-- apply_voucher_to_order() below (SECURITY DEFINER), which re-validates
-- and re-computes everything itself rather than trusting caller input —
-- same shape as submit_payment_transaction() (0020) and
-- accept_negotiation_offer() (0019).
--
-- Run this BEFORE 0022_quests.sql — quests reward clients with vouchers,
-- so the quests migration references this table.
-- ============================================================

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric(5, 2) not null check (discount_percent > 0 and discount_percent <= 100),
  source text not null check (source in ('admin', 'quest_reward', 'public_promo')),
  -- NULL = a public promo code anyone who knows it can redeem (up to
  -- max_redemptions times). Non-null = a personal voucher reserved for one
  -- client (admin-assigned or quest-earned) — see the constraint below.
  client_id uuid references public.clients (id) on delete cascade,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemptions_count integer not null default 0 check (redemptions_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- A personal voucher only ever makes sense as single-use — enforced here
-- rather than trusted to the admin UI to always set max_redemptions = 1
-- whenever client_id is set.
alter table public.vouchers
  add constraint vouchers_personal_single_use
  check (client_id is null or max_redemptions = 1);

-- Redemption audit trail. A separate table (not just a column on
-- `vouchers`) because a public promo code can be redeemed by many
-- different clients/orders — one voucher, many redemption rows.
create table public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers (id) on delete cascade,
  -- UNIQUE — at most one voucher per order, enforced at the DB level as a
  -- second line of defense alongside apply_voucher_to_order()'s own check.
  order_id uuid not null unique references public.orders (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  discount_percent numeric(5, 2) not null,
  original_price_usd numeric(12, 2) not null,
  discounted_price_usd numeric(12, 2) not null,
  redeemed_at timestamptz not null default now()
);

create index voucher_redemptions_voucher_id_idx on public.voucher_redemptions (voucher_id);

-- Codes are always normalized to upper(trim(...)) at write time, so admin
-- never has to remember to type/paste a code in a consistent case, and
-- redemption lookups can normalize the same way.
create or replace function public.normalize_voucher_code()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;

create trigger vouchers_normalize_code
  before insert or update on public.vouchers
  for each row execute function public.normalize_voucher_code();

alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;

-- vouchers — a client only ever sees vouchers explicitly assigned to them
-- (client_id = their own). Public promo codes (client_id null) are
-- deliberately NOT browsable/selectable by clients at all — same as a
-- normal coupon code, you must already know it (from an announcement) to
-- use it; apply_voucher_to_order() below validates a public code purely by
-- its text, without needing a SELECT policy to expose the row first.
create policy "vouchers_select_own_or_admin" on public.vouchers
  for select using (
    (client_id is not null and public.is_owner_client(client_id))
    or public.is_admin()
  );

create policy "vouchers_admin_write" on public.vouchers
  for all using (public.is_admin()) with check (public.is_admin());

create policy "voucher_redemptions_select_own_or_admin" on public.voucher_redemptions
  for select using (public.is_owner_client(client_id) or public.is_admin());

-- No client insert/update policy on voucher_redemptions at all — every row
-- here is created exclusively inside apply_voucher_to_order() below, same
-- reasoning as commissions (0013)/partner_rewards (0016): the only path in
-- is the RPC's own internal logic, never a direct table write.
create policy "voucher_redemptions_admin_write" on public.voucher_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

-- apply_voucher_to_order — the ONLY way a voucher can ever be redeemed.
-- Re-derives the discount from the voucher row itself (never trusts a
-- percent/amount from the caller), locks both the order and voucher rows
-- (FOR UPDATE) so two concurrent redemption attempts on the same public
-- code near its redemption cap serialize correctly instead of racing past
-- it, and only allows one voucher per order (checked here AND enforced by
-- voucher_redemptions.order_id's UNIQUE constraint as a second layer).
create or replace function public.apply_voucher_to_order(p_order_id uuid, p_code text)
returns table (new_final_price_usd numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_voucher record;
  v_discounted numeric;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not public.is_owner_client(v_order.client_id) then
    raise exception 'Not authorized.';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'Vouchers can only be applied while an order is awaiting payment.';
  end if;
  if v_order.final_price_usd is null then
    raise exception 'No agreed price is set on this order yet.';
  end if;
  if exists (select 1 from public.voucher_redemptions where order_id = p_order_id) then
    raise exception 'A voucher has already been applied to this order.';
  end if;

  select * into v_voucher
  from public.vouchers
  where code = upper(trim(p_code))
  for update;

  if v_voucher is null or not v_voucher.is_active then
    raise exception 'That voucher code is invalid or no longer active.';
  end if;
  if v_voucher.expires_at is not null and v_voucher.expires_at < now() then
    raise exception 'That voucher code has expired.';
  end if;
  if v_voucher.redemptions_count >= v_voucher.max_redemptions then
    raise exception 'That voucher code has already been fully redeemed.';
  end if;
  if v_voucher.client_id is not null and v_voucher.client_id <> v_order.client_id then
    raise exception 'That voucher code is not valid for your account.';
  end if;

  v_discounted := round(v_order.final_price_usd * (1 - v_voucher.discount_percent / 100), 2);

  update public.vouchers
  set redemptions_count = redemptions_count + 1
  where id = v_voucher.id;

  insert into public.voucher_redemptions (
    voucher_id, order_id, client_id, discount_percent, original_price_usd, discounted_price_usd
  )
  values (
    v_voucher.id, p_order_id, v_order.client_id, v_voucher.discount_percent,
    v_order.final_price_usd, v_discounted
  );

  update public.orders set final_price_usd = v_discounted where id = p_order_id;

  return query select v_discounted;
end;
$$;

grant execute on function public.apply_voucher_to_order(uuid, text) to authenticated;
