-- ============================================================
-- 0038: Custom Order Builder + Payment Plan (installments)
--
-- Implements the Custom Order spec (12 Agustus 2026): a multi-service
-- project configurator with a server-validated pricing engine, Pay in
-- Full / Pay in Installments (+30% flexibility fee, admin-configurable),
-- milestone-based invoicing, and integration with the existing
-- negotiation/payment/Partner Program/Discord systems — WITHOUT touching
-- how Project Builder or Package/Bundle orders already work. Every new
-- column on `orders` defaults to null/'none' for those, and every new
-- trigger below is a strict no-op unless `orders.payment_method` has been
-- set — which only the new Custom Order submit action ever does.
--
-- Product decisions confirmed by the user (12 Agustus 2026, via
-- AskUserQuestion, before this migration was written — see
-- custom-order-architecture-plan.md delivered the same session):
--   1. An installment order counts as 'paid' (project starts, receipt
--      issued, Partner reward triggered) once the FIRST installment is
--      confirmed — not after every installment clears.
--   2. Partner referral rewards on an installment order are computed on
--      the NORMAL (pre-fee) price, never on the installment-inflated
--      total — the 30% flexibility fee is not partner-earning revenue.
--   3. The installment fee percentage is admin-configurable (a settings
--      row), not a hardcoded constant.
--   4. Which milestone schedule (2 vs 3 vs custom split) applies to an
--      order is chosen by Admin during review, not derived automatically
--      from a price threshold. Defaults to Two Milestones (50/50) if
--      Admin never explicitly overrides it.
--
-- PREREQUISITE — reads/extends public.orders (0003/0012/0013/0020),
-- public.order_negotiations (0013), public.payment_wallets (0013/0015),
-- public.crypto_network (0013), public.partners/partner_rewards (0016),
-- public.notify_staff()/notify_client_by_client_id() (0032). Run those
-- first if you haven't. Independent of 0034-0037 (order/content only).
-- ============================================================

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------

-- Which entry path an order came from. Existing orders are backfilled
-- below; every future Project Builder / Package order keeps inserting
-- with the default, so this is purely additive for those two flows.
create type public.order_flow_type as enum ('project_builder', 'package', 'custom');

create type public.order_payment_method as enum ('full_payment', 'installments');

create type public.order_payment_plan as enum ('none', 'two_milestones', 'three_milestones', 'custom');

create type public.installment_status as enum (
  'scheduled',       -- exists, but locked behind an earlier unpaid installment
  'pending_payment',  -- payable now, client hasn't submitted yet
  'payment_submitted', -- client sent a tx hash, awaiting admin verification
  'paid',
  'overdue',          -- reserved for future due-date tracking; never set automatically today
  'cancelled'
);

-- ------------------------------------------------------------------
-- orders: new columns for Custom Order + Payment Plan. All nullable /
-- default to the "not a custom order" value, so every existing row and
-- every existing INSERT (Project Builder, Package) is unaffected.
-- ------------------------------------------------------------------

alter table public.orders
  add column order_flow_type public.order_flow_type not null default 'project_builder',
  add column payment_method public.order_payment_method,
  add column payment_plan public.order_payment_plan not null default 'none',
  -- Snapshot of the pre-installment-fee reference price. Derived
  -- automatically (see derive_order_normal_price() below) the moment
  -- final_price_usd is set on an order that has a payment_method — never
  -- written directly by any application code. Null for every
  -- full-payment/legacy order, where final_price_usd already IS the
  -- normal price. This is what the Partner reward trigger multiplies by
  -- instead of final_price_usd for installment orders (product decision
  -- #2 above) — the 30% flexibility fee never inflates a partner's cut.
  add column normal_price_usd numeric(12, 2),
  -- Only meaningful when payment_plan = 'custom' (large projects, spec
  -- section 12) — Admin fills these in during review before accepting/
  -- quoting the order; materialize_order_installments() below reads them
  -- once, at the moment installments are generated. Both null for every
  -- other payment_plan value.
  add column custom_installment_percentages numeric(5, 2)[],
  add column custom_installment_labels text[];

comment on column public.orders.order_flow_type is
  'Which /order entry path this came from — project_builder (single service, default), package (fixed bundle, package_name is set), or custom (Custom Order Builder, multi-service — see order_service_selections). Backfilled once below for existing rows; every new INSERT sets it explicitly.';
comment on column public.orders.payment_method is
  'Custom Order only (spec section 10) — full_payment or installments. Null for every Project Builder / Package order, which have no payment-plan concept and keep using the single-payment orders.payment_* columns exactly as before this migration.';
comment on column public.orders.payment_plan is
  'Custom Order + payment_method=installments only. Defaults to none; the milestone-materialization trigger below treats none as two_milestones (spec section 12''s stated default) so Admin never HAS to touch this to keep the flow moving — three_milestones/custom are explicit Admin overrides during review.';
comment on column public.orders.normal_price_usd is
  'Derived automatically by derive_order_normal_price() below whenever final_price_usd is set on an order with a payment_method. For payment_method=installments, this is final_price_usd with the installment fee backed out — the number the Partner reward trigger (0016, redefined below) uses instead of final_price_usd, per the 12 Agustus 2026 product decision that referral rewards reflect project value, not the payment-flexibility fee.';

update public.orders set order_flow_type = 'package' where package_name is not null;

-- Package/Bundle orders already snapshot a display name into package_name
-- (0036). Custom Order reuses the exact same column/fallback chain for
-- its own multi-service display label instead of adding a 5th place
-- every "which service is this" read site (receipt PDFs, both apps'
-- Orders lists/detail) would otherwise need to learn about — see
-- 0036_order_package_name.sql's own comment for the fallback chain this
-- extends: `service?.name ?? order.package_name ?? "Custom Project"`.
comment on column public.orders.package_name is
  'Set once at insert, never updated after. For Package/Bundle orders (0036): the bundle''s display name, e.g. "Web3 Launch Package". For Custom Orders (0038): a generated summary of the selected services, e.g. "Custom Order: Animation, Website Development" — see submitCustomOrderAction. Null for every Project Builder order, which uses service_id instead.';

-- ------------------------------------------------------------------
-- order_negotiations: which price basis (full vs installment-inflated)
-- an offer was made against — spec section 17. Null for every
-- Project Builder/Package negotiation, which has no payment-method
-- concept at all.
-- ------------------------------------------------------------------

alter table public.order_negotiations add column payment_method public.order_payment_method;

comment on column public.order_negotiations.payment_method is
  'Custom Order only — which price basis (full_payment or installments) this specific offer was made against, so Admin reviewing a counter-offer can tell a $600 offer against a $650 installment price apart from a $600 offer against a $500 full-payment price (spec section 17). Null for every Project Builder/Package negotiation.';

-- ------------------------------------------------------------------
-- installment_settings: admin-configurable fee percentage (product
-- decision #3). Singleton table, same "id boolean primary key default
-- true" shape as discord_leaderboard_state (0035) — one row, always.
-- ------------------------------------------------------------------

create table public.installment_settings (
  id boolean primary key default true,
  constraint installment_settings_singleton check (id),
  fee_percentage numeric(5, 2) not null default 30.00 check (fee_percentage >= 0 and fee_percentage < 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

insert into public.installment_settings (id) values (true);

alter table public.installment_settings enable row level security;

-- Public read — the fee percentage has to be visible to a client
-- configuring a Custom Order (Step 5's live "Installment pricing
-- includes a 30% flexibility fee" disclosure) before the server ever
-- recomputes anything, same posture as payment_wallets' active-wallet
-- read policy.
create policy "installment_settings_public_read" on public.installment_settings
  for select using (true);

create policy "installment_settings_admin_write" on public.installment_settings
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_installment_fee_percentage()
returns numeric
language sql
stable
as $$
  select fee_percentage from public.installment_settings where id = true;
$$;

grant execute on function public.get_installment_fee_percentage() to authenticated, anon;

-- ------------------------------------------------------------------
-- order_service_selections: one row per service a client added to a
-- Custom Order — the multi-service equivalent of orders.service_id
-- (which is a single nullable FK and can't represent "N services in one
-- order"). Line prices here are computed SERVER-SIDE by
-- submitCustomOrderAction from the same shared pricing catalog/functions
-- Project Builder already uses (never trusted from the client) — same
-- trust level as orders.proposed_price_usd (0020's own comment: "the
-- client's own opening ask ... not an authoritative/verification
-- field"). The authoritative number is still only ever orders.final_price_usd,
-- set later by Admin via the existing accept/quote actions, unchanged by
-- this migration.
-- ------------------------------------------------------------------

create table public.order_service_selections (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  category_id text not null,
  service_id uuid references public.services (id) on delete set null,
  service_name text not null,
  config_selections jsonb not null default '{}'::jsonb,
  line_price_usd numeric(12, 2) not null default 0,
  delivery_days integer not null default 0,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index order_service_selections_order_id_idx on public.order_service_selections (order_id);

alter table public.order_service_selections enable row level security;

create policy "order_service_selections_select_own_or_admin" on public.order_service_selections
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_service_selections.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

-- Same shape as order_files_insert_own (0006) — written once, by the
-- owning client's own submit action, at order-creation time.
create policy "order_service_selections_insert_own_or_admin" on public.order_service_selections
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_service_selections.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

-- ------------------------------------------------------------------
-- order_price_breakdown: the "how this number was built" line items
-- spec section 21 explicitly requires (never store only a total) — base
-- per-service prices, add-ons, the installment fee, discounts/vouchers.
-- Same write posture as order_service_selections above.
-- ------------------------------------------------------------------

create table public.order_price_breakdown (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('base_service', 'addon', 'installment_fee', 'discount', 'voucher')),
  label text not null,
  amount_usd numeric(12, 2) not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index order_price_breakdown_order_id_idx on public.order_price_breakdown (order_id);

alter table public.order_price_breakdown enable row level security;

create policy "order_price_breakdown_select_own_or_admin" on public.order_price_breakdown
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_price_breakdown.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

create policy "order_price_breakdown_insert_own_or_admin" on public.order_price_breakdown
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_price_breakdown.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

-- ------------------------------------------------------------------
-- order_installments: one row per milestone/invoice. Every Custom Order
-- gets at least one row (Pay in Full = a single 100% row) once Admin
-- confirms a price — see materialize_order_installments() below. This is
-- the "invoice" concept from spec sections 13/14/24: each row carries its
-- own copy of the payment fields orders.payment_* has had since 0013,
-- because unlike a legacy single-payment order, each installment is
-- independently paid and independently verified.
--
-- NOTE: payment_network is `text` here (not the crypto_network enum),
-- matching orders.payment_network's own existing column type exactly
-- (0013) — kept consistent rather than "more correctly" typed, since
-- every payment-quote codepath already treats it as text end to end.
-- ------------------------------------------------------------------

create table public.order_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sequence smallint not null check (sequence > 0),
  label text not null,
  percentage numeric(5, 2) not null check (percentage > 0 and percentage <= 100),
  amount_usd numeric(12, 2) not null check (amount_usd > 0),
  status public.installment_status not null default 'scheduled',
  payment_network text,
  payment_token text,
  payment_wallet_address text,
  payment_expected_amount numeric(18, 8),
  payment_tx_hash text,
  payment_submitted_at timestamptz,
  payment_verified_by uuid references public.users (id) on delete set null,
  payment_verified_at timestamptz,
  payment_underpaid_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, sequence)
);

create index order_installments_order_id_idx on public.order_installments (order_id);

create trigger set_order_installments_updated_at
  before update on public.order_installments
  for each row execute function public.set_updated_at();

alter table public.order_installments enable row level security;

create policy "order_installments_select_own_or_admin" on public.order_installments
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_installments.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

-- Admin can flag-underpaid / verify with a plain UPDATE (same posture as
-- orders_update_admin_only, 0006) — those are simple authenticated-admin
-- status flips, not price-sensitive recomputation, so no RPC needed for
-- that half. The CLIENT-facing "I paid" half is intentionally NOT
-- covered by any client policy here at all — see
-- submit_installment_payment() below for why that one write goes through
-- a SECURITY DEFINER RPC instead (same reasoning as submit_payment_transaction,
-- 0020).
create policy "order_installments_admin_write" on public.order_installments
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- derive_order_normal_price — BEFORE UPDATE trigger on orders. Whenever
-- final_price_usd is (re)set on an order that has a payment_method,
-- automatically derives normal_price_usd from it. Runs regardless of
-- WHICH code path set final_price_usd (accept_negotiation_offer RPC,
-- Admin's sendQuotationForPaymentAction, a future path) — a single
-- source of truth instead of duplicating "back out the installment fee"
-- math in every call site that can ever set a price. No SECURITY DEFINER
-- needed: it only reads get_installment_fee_percentage(), which is
-- public-readable, and mutates NEW on the same row already being
-- written by whatever privileged caller triggered this UPDATE in the
-- first place.
-- ------------------------------------------------------------------

create or replace function public.derive_order_normal_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_method is not null
     and new.final_price_usd is not null
     and new.final_price_usd is distinct from old.final_price_usd
  then
    if new.payment_method = 'installments' then
      new.normal_price_usd := round(new.final_price_usd / (1 + public.get_installment_fee_percentage() / 100), 2);
    else
      new.normal_price_usd := new.final_price_usd;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_derive_normal_price on public.orders;

create trigger orders_derive_normal_price
  before update on public.orders
  for each row execute function public.derive_order_normal_price();

-- ------------------------------------------------------------------
-- materialize_order_installments — AFTER UPDATE trigger on orders. Fires
-- exactly once per order, the instant it transitions into
-- 'awaiting_payment' with a payment_method set (Custom Order only —
-- every other order has payment_method null, so this is a strict no-op
-- for Project Builder/Package). Generates the order_installments rows
-- for that order's chosen method/plan, cent-accurately (spec section
-- 23 — the last installment absorbs any rounding remainder so the sum
-- always equals final_price_usd exactly, never drifts by a cent).
-- ------------------------------------------------------------------

create or replace function public.materialize_order_installments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_pct numeric[];
  v_labels text[];
  v_n int;
  v_running numeric := 0;
  v_amount numeric;
  v_plan public.order_payment_plan;
  i int;
begin
  if new.status <> 'awaiting_payment'
     or old.status is not distinct from 'awaiting_payment'
     or new.payment_method is null
     or new.final_price_usd is null
     or exists (select 1 from public.order_installments where order_id = new.id)
  then
    return new;
  end if;

  v_total := new.final_price_usd;

  if new.payment_method = 'full_payment' then
    insert into public.order_installments (order_id, sequence, label, percentage, amount_usd, status)
    values (new.id, 1, 'Full Payment', 100, v_total, 'pending_payment');
    return new;
  end if;

  -- installments — 'none' falls back to the spec's stated default
  -- (Two Milestones, 50/50) rather than blocking the flow: Admin
  -- reviewing the order can explicitly choose Three Milestones or Custom
  -- during review (product decision #4), but never HAS to touch this
  -- field just to keep a standard-size order moving.
  v_plan := case when new.payment_plan = 'none' then 'two_milestones' else new.payment_plan end;

  if v_plan = 'two_milestones' then
    v_pct := array[50, 50];
    v_labels := array['Project Start', 'Before Final Delivery'];
  elsif v_plan = 'three_milestones' then
    v_pct := array[30, 30, 40];
    v_labels := array['Project Start', 'Project Milestone', 'Final Delivery'];
  elsif v_plan = 'custom' then
    if new.custom_installment_percentages is null or array_length(new.custom_installment_percentages, 1) < 2 then
      raise exception 'A custom payment plan needs at least 2 milestone percentages set by Admin before pricing is confirmed.';
    end if;
    if abs((select sum(x) from unnest(new.custom_installment_percentages) x) - 100) > 0.01 then
      raise exception 'Custom milestone percentages must add up to 100.';
    end if;
    v_pct := new.custom_installment_percentages;
    v_n := array_length(v_pct, 1);
    if new.custom_installment_labels is not null and array_length(new.custom_installment_labels, 1) = v_n then
      v_labels := new.custom_installment_labels;
    else
      v_labels := array(select 'Milestone ' || g from generate_series(1, v_n) g);
    end if;
  end if;

  v_n := array_length(v_pct, 1);
  for i in 1..v_n loop
    if i < v_n then
      v_amount := round(v_total * v_pct[i] / 100, 2);
      v_running := v_running + v_amount;
    else
      -- Last installment absorbs the rounding remainder — see this
      -- function's own header comment / spec section 23.
      v_amount := round(v_total - v_running, 2);
    end if;
    insert into public.order_installments (order_id, sequence, label, percentage, amount_usd, status)
    values (new.id, i, v_labels[i], v_pct[i], v_amount, case when i = 1 then 'pending_payment' else 'scheduled' end);
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_materialize_installments on public.orders;

create trigger orders_materialize_installments
  after update on public.orders
  for each row execute function public.materialize_order_installments();

-- ------------------------------------------------------------------
-- submit_installment_payment — client-callable SECURITY DEFINER RPC,
-- structurally identical to submit_payment_transaction() (0020): never
-- trusts the client for the wallet address or expected amount, re-derives
-- both fresh from payment_wallets + the installment's own amount_usd.
-- Scoped to ONE order_installments row instead of a whole order.
-- ------------------------------------------------------------------

create or replace function public.submit_installment_payment(
  p_installment_id uuid,
  p_network text,
  p_currency text,
  p_tx_hash text,
  p_rate_usd numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment record;
  v_order record;
  v_wallet record;
  v_is_stablecoin boolean;
  v_is_native boolean;
  v_expected_amount numeric;
  v_trimmed_hash text;
begin
  v_trimmed_hash := trim(coalesce(p_tx_hash, ''));
  if v_trimmed_hash = '' then
    raise exception 'Enter the transaction hash for your payment.';
  end if;

  select * into v_installment from public.order_installments where id = p_installment_id;
  if v_installment is null then
    raise exception 'Installment not found.';
  end if;

  select * into v_order from public.orders where id = v_installment.order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not public.is_owner_client(v_order.client_id) then
    raise exception 'Not authorized.';
  end if;
  if v_installment.status <> 'pending_payment' then
    raise exception 'This installment is not currently awaiting payment.';
  end if;

  select *
  into v_wallet
  from public.payment_wallets
  where network = p_network::public.crypto_network
    and is_active = true;
  if v_wallet is null then
    raise exception 'That payment network isn''t available right now.';
  end if;

  v_is_stablecoin := p_currency = any(v_wallet.stablecoin_symbols);
  v_is_native := v_wallet.allow_native
    and v_wallet.native_symbol is not null
    and v_wallet.native_symbol = p_currency;

  if not v_is_stablecoin and not v_is_native then
    raise exception 'That currency isn''t accepted on this network.';
  end if;

  if v_is_stablecoin then
    v_expected_amount := v_installment.amount_usd;
  else
    if p_rate_usd is null or p_rate_usd <= 0 then
      raise exception 'A live exchange rate is required for this currency.';
    end if;
    v_expected_amount := v_installment.amount_usd / p_rate_usd;
  end if;

  update public.order_installments
  set status = 'payment_submitted',
      payment_network = p_network,
      payment_token = p_currency,
      payment_wallet_address = v_wallet.address,
      payment_expected_amount = v_expected_amount,
      payment_tx_hash = v_trimmed_hash,
      payment_submitted_at = now(),
      payment_underpaid_note = null
  where id = p_installment_id;
end;
$$;

grant execute on function public.submit_installment_payment(uuid, text, text, text, numeric) to authenticated;

-- ------------------------------------------------------------------
-- handle_installment_paid — AFTER UPDATE trigger on order_installments.
-- When Admin verifies an installment (a plain admin-gated UPDATE, see
-- order_installments_admin_write above — mirrors verifyPaymentAction's
-- existing raw-update posture, no RPC needed for that half):
--   1. Unlocks the next 'scheduled' installment (flips it to
--      'pending_payment') and notifies the client it's now payable.
--   2. If this was installment #1, flips the PARENT order to 'paid' —
--      product decision #1 (project starts / receipt issues / Partner
--      reward fires on the FIRST installment, not the last). This
--      deliberately reuses every existing 'paid'-transition trigger
--      for free: orders_create_project_on_paid (0029),
--      orders_create_receipt_on_paid (0024),
--      handle_order_paid_partner_reward (0016, redefined below),
--      notify_on_order_status_change (0032/0037) — none of those needed
--      to change to support installments.
-- ------------------------------------------------------------------

create or replace function public.handle_installment_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next record;
  v_client_id uuid;
begin
  if new.status <> 'paid' or old.status is not distinct from 'paid' then
    return new;
  end if;

  select client_id into v_client_id from public.orders where id = new.order_id;

  select * into v_next
  from public.order_installments
  where order_id = new.order_id and status = 'scheduled'
  order by sequence asc
  limit 1;

  if v_next is not null then
    update public.order_installments set status = 'pending_payment' where id = v_next.id;
    perform public.notify_client_by_client_id(
      v_client_id,
      'order_installment_due',
      'Next installment is ready',
      'Installment ' || v_next.sequence || ' (' || v_next.label || ') for your order is now ready to pay.',
      '/dashboard/orders'
    );
  end if;

  if new.sequence = 1 then
    update public.orders
    set status = 'paid',
        payment_verified_by = coalesce(new.payment_verified_by, payment_verified_by),
        payment_verified_at = coalesce(new.payment_verified_at, payment_verified_at)
    where id = new.order_id and status = 'awaiting_payment';
  end if;

  return new;
end;
$$;

drop trigger if exists order_installments_after_paid on public.order_installments;

create trigger order_installments_after_paid
  after update on public.order_installments
  for each row execute function public.handle_installment_paid();

-- ------------------------------------------------------------------
-- Partner reward trigger (0016) — redefined so an installment order's
-- reward is computed on normal_price_usd (pre-fee) instead of
-- final_price_usd (installment-inflated), per product decision #2. Same
-- signature/trigger, CREATE OR REPLACE only — no drop needed. Every
-- other line of this function is byte-for-byte identical to 0016's
-- version; only the amount_usd computation changed.
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
  v_reward_base numeric;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select pr.partner_id into v_partner_id
    from public.partner_referrals pr
    join public.clients c on c.user_id = pr.referred_user_id
    where c.id = new.client_id
    limit 1;

    if v_partner_id is not null and new.final_price_usd is not null then
      select is_founding_partner into v_is_founding from public.partners where id = v_partner_id;
      v_paid_clients_count := public.partner_paid_clients_count(v_partner_id);
      v_rate := public.partner_commission_rate(v_paid_clients_count, v_is_founding);

      -- The 12 Agustus 2026 decision: an installment order's reward
      -- reflects project value, never the payment-flexibility fee.
      -- normal_price_usd is null for every full-payment/legacy order
      -- (derive_order_normal_price only sets it when payment_method is
      -- present), so this falls back to final_price_usd exactly as
      -- before for those — zero behavior change outside Custom Order.
      v_reward_base := coalesce(new.normal_price_usd, new.final_price_usd);

      insert into public.partner_rewards (partner_id, order_id, amount_usd, rate_applied, status)
      values (v_partner_id, new.id, v_reward_base * v_rate, v_rate, 'pending')
      on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Tighten orders_insert_own (0020) so a client's own order INSERT can
-- never pre-seed normal_price_usd or the custom milestone arrays — both
-- are Admin/trigger-derived only, same defense-in-depth reasoning 0020
-- itself already applied to every other verification/payment column.
-- payment_method/payment_plan are deliberately NOT restricted here: like
-- proposed_price_usd, they're the client's own stated intent at
-- submission time, not authoritative fields (Admin's own review can
-- still change payment_plan later during quotation).
-- ------------------------------------------------------------------

drop policy if exists "orders_insert_own" on public.orders;

create policy "orders_insert_own" on public.orders
  for insert
  with check (
    public.is_owner_client(client_id)
    and status in ('pending_review', 'negotiating')
    and final_price_usd is null
    and payment_network is null
    and payment_token is null
    and payment_wallet_address is null
    and payment_expected_amount is null
    and payment_tx_hash is null
    and payment_submitted_at is null
    and payment_verified_by is null
    and payment_verified_at is null
    and payment_underpaid_note is null
    and normal_price_usd is null
    and custom_installment_percentages is null
    and custom_installment_labels is null
  );
