-- ============================================================
-- 0024: Order Receipts — a downloadable PDF receipt once an order's
-- payment is verified ('paid').
--
-- Part of the audit roadmap's P1 item #6 ("Invoice/PDF generation"). Scope
-- decided with the user (4 Agustus 2026): a RECEIPT only, issued once an
-- order reaches 'paid' — not a separate pre-payment invoice/quotation PDF
-- (PaymentPanel.tsx already shows the amount due + wallet address live
-- before payment, so a formal document is only needed as proof AFTER
-- payment completes).
--
-- This is a NEW, minimal table — deliberately NOT reusing the legacy
-- `invoices`/`payments`/`receipts` trio from 0005_billing.sql. Per the P0.5
-- audit, that whole trio is dead code (nothing in the app writes to it
-- anymore — it was for the old manual/IDR invoice flow, superseded by the
-- order-based crypto payment flow this table hooks into instead). The one
-- thing reused from 0005 is `next_document_number()`, a generic atomic
-- per-(date,prefix) counter with no FK ties to the dead tables, so it's
-- safe to call again here for a fresh 'RCT' sequence.
--
-- MUST run after 0006_rls_policies.sql (is_owner_client/is_admin) and
-- 0005_billing.sql (next_document_number). Independent of 0021-0023
-- (Vouchers/Quests) — order and content don't matter relative to those.
-- ============================================================

create table public.order_receipts (
  id uuid primary key default gen_random_uuid(),
  -- One receipt per order — an order only ever gets marked 'paid' once
  -- (there's no "un-pay" transition anywhere in this app), so this is a
  -- correctness constraint, not just a convenience index.
  order_id uuid not null unique references public.orders (id) on delete cascade,
  receipt_number text not null unique default public.next_document_number('RCT'),
  created_at timestamptz not null default now()
);

alter table public.order_receipts enable row level security;

-- Same shape as every other "client reads their own, admin reads all"
-- policy in this schema — order_receipts has no client_id of its own, so
-- this joins back to orders to reuse is_owner_client() the same way
-- voucher_redemptions (0021) does for its own order_id-scoped rows.
create policy "order_receipts_select_own_or_admin" on public.order_receipts
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_receipts.order_id
        and (public.is_owner_client(o.client_id) or public.is_admin())
    )
  );

-- No client insert/update policy at all — a receipt is only ever created
-- by the trigger below or by get_or_create_order_receipt() (both run as
-- SECURITY DEFINER), never by a direct client write. Same "RLS is the real
-- boundary, no client-writable path" convention as vouchers/quests (0021,
-- 0022) and the P0.5 audit fixes.
create policy "order_receipts_admin_write" on public.order_receipts
  for all using (public.is_admin()) with check (public.is_admin());

-- Auto-create a receipt the instant an order becomes 'paid' — mirrors the
-- shape of orders_check_quests_after_paid (0022), a separate trigger from
-- the commission/quest ones so none of these risk regressing each other.
create or replace function public.orders_create_receipt_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.order_receipts (order_id)
    values (new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_create_receipt_after_paid on public.orders;

create trigger orders_create_receipt_after_paid
  after update on public.orders
  for each row execute function public.orders_create_receipt_on_paid();

-- get_or_create_order_receipt — the endpoint that actually generates the
-- downloadable PDF (apps/studio and apps/admin's own
-- app/api/orders/[id]/receipt/route.ts) calls this FIRST to obtain a
-- stable receipt_number, rather than reading order_receipts directly.
--
-- This is deliberately self-healing, not just a passthrough SELECT: the
-- trigger above only fires on the UPDATE transition into 'paid', so an
-- order that was ALREADY 'paid' before this migration ever ran (or before
-- any future gap in trigger coverage) would otherwise never get a receipt
-- row at all. This is the exact same class of bug 0023 just fixed for
-- Quests (a tester's already-'paid' order never got its quest
-- auto-awarded because the transition trigger had nothing to fire on) —
-- applying that lesson here up front instead of waiting to hit it again.
create or replace function public.get_or_create_order_receipt(p_order_id uuid)
returns table (receipt_number text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  select client_id, status into v_order from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not (public.is_owner_client(v_order.client_id) or public.is_admin()) then
    raise exception 'Not authorized to access this order''s receipt.';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'A receipt is only available once payment has been verified.';
  end if;

  insert into public.order_receipts (order_id)
  values (p_order_id)
  on conflict (order_id) do nothing;

  return query
  select r.receipt_number, r.created_at
  from public.order_receipts r
  where r.order_id = p_order_id;
end;
$$;

grant execute on function public.get_or_create_order_receipt(uuid) to authenticated;
