-- ============================================================
-- 0043: get_order_payment_summary() — the single, centralized "how much
-- of this order has ACTUALLY been paid" calculation.
--
-- Part of the Fase 1 (Payment Architecture) step of the Order/Payment/
-- Invoice refactor agreed with the user 16 Agustus 2026 (see project memory
-- order_payment_invoice_refactor_fase0.md / FASE0-AUDIT.md for the full
-- audit this responds to). Root problem this fixes: `order_installments`
-- (0038) already IS the correct, structurally-accurate payment ledger —
-- one row per milestone, cent-accurate — but nothing reads it as one. Every
-- money-displaying surface today (receipt PDF, apps/app + apps/admin
-- Invoices pages) reads `orders.final_price_usd` directly instead, which is
-- the PROJECT TOTAL, not what has actually cleared. For an installment
-- order sitting on just installment #1 paid, that overstates "amount paid"
-- by the unpaid remainder every single time.
--
-- This migration is PURELY ADDITIVE — one new enum, one new read-only
-- function, zero changes to any existing table/column/trigger/policy.
-- Nothing that already works today can break by running this.
--
-- PREREQUISITE — reads public.orders (0003/0012/0013/0020/0038) and
-- public.order_installments (0038). Both already confirmed APPLIED in
-- production (verify_migrations_status.sql, re-run by the user 15 Agustus
-- 2026 — see project memory audit_fixes_15agst.md). Independent of every
-- other migration in this file's neighborhood.
-- ============================================================

-- Deliberately mirrors the shape the user asked for (UNPAID / PARTIALLY_PAID
-- / PAID / OVERDUE), lower-cased to match this schema's existing enum
-- convention (order_status, installment_status, etc. are all lower_snake).
-- `overdue` is included for forward-compatibility with the OLD (dead,
-- 0005_billing.sql) `invoice_status` enum's own `overdue` value and this
-- schema's existing `installment_status.overdue` value — neither is ever
-- set automatically by any trigger today (no due-date tracking exists yet),
-- so this function never returns it either. Reserved, not wired up.
create type public.order_payment_status as enum ('unpaid', 'partially_paid', 'paid', 'overdue');

-- get_order_payment_summary — deliberately PLAIN (no `security definer`),
-- unlike get_or_create_order_receipt (0024) or submit_installment_payment
-- (0038). Those two need SECURITY DEFINER because they WRITE past RLS
-- policies that have no client-insert path. This function only ever READS
-- `orders` and `order_installments`, both of which ALREADY have a
-- "client reads their own, admin reads all" select policy
-- (orders_select_own_or_admin / order_installments_select_own_or_admin,
-- 0006/0038) — running as the CALLING user (Postgres's default, "security
-- invoker") means those existing policies are the only authorization check
-- this function needs. No caller-supplied client_id, no manual is_admin()/
-- is_owner_client() check to duplicate and risk drifting from the real RLS
-- policy over time.
--
-- Two cases, by design:
--   1. An order WITH order_installments rows (every order submitted since
--      0038 — 15 Agustus 2026 onward, once payment_method became required
--      for Project Builder/Package/Custom Order — has at least one row,
--      even a full_payment order: materialize_order_installments always
--      generates a single 100% row for those). paid_amount_usd sums
--      exactly the rows Admin has actually verified 'paid'.
--   2. A LEGACY order with NO order_installments rows at all (predates
--      payment_method existing, or a Creative Agent order today — see
--      Fase 4 of the refactor plan, not yet built). These orders only ever
--      had ONE possible payment, via the old orders.payment_* /
--      submit_payment_transaction (0020) flow, which has no partial state:
--      orders.status only ever jumps straight from awaiting_payment to
--      paid in one shot. So `orders.status = 'paid'` for one of these
--      really does mean 100% of final_price_usd cleared — that is simply
--      what that flow has always meant, not a guess or a fabricated value
--      (per the refactor brief's Fase 14 rule: never invent a number for
--      ambiguous legacy data — this isn't ambiguous).
create or replace function public.get_order_payment_summary(p_order_id uuid)
returns table (
  order_id uuid,
  total_amount_usd numeric,
  paid_amount_usd numeric,
  remaining_amount_usd numeric,
  payment_status public.order_payment_status,
  has_installments boolean
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_final_price numeric;
  v_order_status public.order_status;
  v_installment_count int;
  v_paid numeric;
begin
  select o.final_price_usd, o.status
  into v_final_price, v_order_status
  from public.orders o
  where o.id = p_order_id;

  -- Row not found OR not visible under this caller's RLS (not their own
  -- order, not admin) — return an empty result set, same "just no rows"
  -- behavior an ordinary filtered SELECT would give, rather than raising
  -- and forcing every call site to wrap this in a try/catch for what is
  -- often just "this order isn't priced yet".
  if not found then
    return;
  end if;

  select count(*)
  into v_installment_count
  from public.order_installments oi
  where oi.order_id = p_order_id;

  if v_installment_count > 0 then
    select coalesce(sum(oi.amount_usd), 0)
    into v_paid
    from public.order_installments oi
    where oi.order_id = p_order_id
      and oi.status = 'paid';
  else
    v_paid := case when v_order_status = 'paid' then coalesce(v_final_price, 0) else 0 end;
  end if;

  return query
  select
    p_order_id,
    coalesce(v_final_price, 0),
    v_paid,
    greatest(coalesce(v_final_price, 0) - v_paid, 0),
    case
      when v_final_price is null or v_final_price <= 0 then 'unpaid'::public.order_payment_status
      when v_paid >= v_final_price then 'paid'::public.order_payment_status
      when v_paid > 0 then 'partially_paid'::public.order_payment_status
      else 'unpaid'::public.order_payment_status
    end,
    v_installment_count > 0;
end;
$$;

comment on function public.get_order_payment_summary(uuid) is
  'Single source of truth for "how much of this order has actually been paid" — total/paid/remaining/status, computed from order_installments (0038) when materialized rows exist, falling back to orders.status for legacy pre-0038 orders that never had any. Every UI surface that needs to show Paid/Remaining/payment status (client dashboard, admin orders list, invoices, receipts) should call this instead of reading orders.final_price_usd directly.';

grant execute on function public.get_order_payment_summary(uuid) to authenticated;
