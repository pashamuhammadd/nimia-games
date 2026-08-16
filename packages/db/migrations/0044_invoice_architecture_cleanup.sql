-- ============================================================
-- 0044: Invoice Architecture — Fase 2
--
-- Two things, per the user's explicit decisions (16 Agustus 2026, Fase 2
-- planning):
--
--   Decision #2 ("Bersihkan sekalian" — clean it up entirely): drop the
--   legacy invoices/invoice_items/payments/receipts trio from 0005_billing.sql
--   outright. Confirmed dead since 0024_order_receipts.sql's own header
--   comment (4 Agustus 2026) — nothing in the app has written to these
--   tables since the crypto-payment flow (0013_negotiation_payments_ambassadors.sql)
--   replaced the old manual/IDR invoice flow they served. Re-verified here
--   before writing this migration: grepped every .ts/.tsx in apps/* and
--   packages/* for `.from("invoices"|"invoice_items"|"payments"|"receipts")`
--   and `public.invoices`/`public.payments`/`public.receipts` — the ONLY
--   live hit was apps/app/app/dashboard/page.tsx's "Pending Payment" stat
--   card, a leftover query nobody fixed when apps/admin got the equivalent
--   fix on 10 Agustus 2026 (see that file's own new comment). Fixed in the
--   same commit as this migration, same pattern admin already uses —
--   otherwise dropping `invoices` here would turn that page's silent
--   "always reads 0" bug into a hard runtime error.
--
--   `document_counters` / `next_document_number()` are NOT part of this
--   cleanup — order_receipts (0024) still calls next_document_number('RCT')
--   for its own numbering, so that function and its counter table stay.
--
--   `invoice_status` / `payment_status` (both defined in 0001_enums_and_users.sql)
--   are dropped too — grepped every .sql migration for
--   `public.invoice_status`/`public.payment_status` and every .ts/.tsx for
--   the same strings: the only references were the 0005 tables' own column
--   definitions being dropped here. Cheap to leave orphaned, but leaving
--   two enum types with zero remaining callers is exactly the kind of
--   growing-complexity residue Fase 0's "backend must be scalable, not
--   increasingly complex" goal was about, so they go too. This is NOT the
--   same as `order_payment_status` (0043_order_payment_summary.sql) — that
--   one is new, actively used, and untouched by this migration.
--
--   Decision #3 ("Backfill juga" — backfill too): extend `order_receipts`
--   (0024) with `installment_id` + `amount_usd`, so a receipt can represent
--   either a whole legacy order (installment_id null, unchanged shape) or
--   ONE specific order_installments row (0038) — the fix for the exact bug
--   the user flagged at the start of this refactor: a receipt/invoice must
--   never claim more was paid than what a specific payment actually
--   covered. Existing rows get amount_usd backfilled from
--   orders.final_price_usd (their only historically correct source, since
--   every pre-existing order_receipts row predates order_installments and
--   was necessarily a full-payment receipt).
--
-- Production `orders`/`projects` are BOTH EMPTY as of 15 Agustus 2026 (user
-- confirmed via 2 separate SQL queries during Fase 0/Fase 1) — so in
-- practice every INSERT/UPDATE below touches zero rows. Written to be
-- correct regardless, not because it's exercised today.
-- ============================================================

-- ------------------------------------------------------------------
-- Part A — drop the dead 0005_billing.sql trio
-- ------------------------------------------------------------------

drop trigger if exists payments_after_verified on public.payments;
drop function if exists public.handle_payment_verified();

drop table if exists public.receipts;
drop table if exists public.payments;
drop table if exists public.invoice_items;
drop table if exists public.invoices;

drop type if exists public.invoice_status;
drop type if exists public.payment_status;

-- ------------------------------------------------------------------
-- Part B — extend order_receipts with installment_id + amount_usd
-- ------------------------------------------------------------------

alter table public.order_receipts
  add column installment_id uuid references public.order_installments (id) on delete set null,
  add column amount_usd numeric(12, 2);

-- The original `order_id uuid not null unique` column constraint
-- (0024_order_receipts.sql) has to go — a multi-milestone order now needs
-- one order_receipts row PER installment, all sharing the same order_id.
-- Found and dropped by querying pg_constraint directly instead of
-- hardcoding the Postgres-assigned name (`order_receipts_order_id_key`),
-- so this doesn't silently no-op if that assumption is ever wrong.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'order_receipts'
    and con.contype = 'u'
    and con.conkey = (
      select array_agg(attnum order by attnum)
      from pg_attribute
      where attrelid = rel.oid and attname = 'order_id'
    );

  if v_constraint_name is not null then
    execute format('alter table public.order_receipts drop constraint %I', v_constraint_name);
  end if;
end $$;

-- New uniqueness split in two: one receipt per installment (plain unique —
-- Postgres allows any number of NULLs through a unique constraint, which is
-- exactly right here since a legacy order-level receipt has no
-- installment_id at all), and one receipt per LEGACY order (partial unique
-- index, only enforced among rows that have no installment_id, so it
-- doesn't conflict with a multi-milestone order's several installment-scoped
-- rows sharing one order_id).
alter table public.order_receipts
  add constraint order_receipts_installment_id_key unique (installment_id);

create unique index order_receipts_order_id_legacy_key
  on public.order_receipts (order_id)
  where installment_id is null;

-- Backfill: every row that exists today predates order_installments
-- entirely (0038 is a later migration than 0024), so it was necessarily a
-- full-payment receipt — orders.final_price_usd is the correct, only
-- historically accurate source for it. Nothing is fabricated for rows
-- where final_price_usd is itself null; amount_usd is left null there too
-- rather than guessing (Fase 0's "never invent values for ambiguous legacy
-- data" principle) — there are no such rows in practice, since 0024's
-- trigger only ever fired on orders.status='paid', which implies a price.
update public.order_receipts r
set amount_usd = o.final_price_usd
from public.orders o
where r.order_id = o.id
  and r.amount_usd is null;

-- ------------------------------------------------------------------
-- Part C — per-installment receipt creation
--
-- Mirrors orders_create_receipt_on_paid (0024) exactly, just scoped to
-- order_installments instead of orders: fires the instant ONE installment
-- clears, not the whole order. Every order created after Fase 1 (16
-- Agustus 2026, client-side full-payment unification) has at least one
-- order_installments row — including full_payment orders, which get a
-- single 100% row — so this is now the primary path for both flows.
-- ------------------------------------------------------------------

create or replace function public.order_installments_create_receipt_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.order_receipts (order_id, installment_id, amount_usd)
    values (new.order_id, new.id, new.amount_usd)
    on conflict (installment_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists order_installments_create_receipt_after_paid on public.order_installments;

create trigger order_installments_create_receipt_after_paid
  after update on public.order_installments
  for each row execute function public.order_installments_create_receipt_on_paid();

-- Redefine orders_create_receipt_on_paid (0024) to skip orders that have
-- order_installments rows — those get their receipt(s) from the trigger
-- above instead, one per installment. This guard leaves the ORIGINAL
-- order-level path in place for genuinely legacy orders only: today that's
-- Creative Agent orders (payment_method never set — confirmed in the Fase 0
-- audit) and any order that predates payment_method existing at all.
create or replace function public.orders_create_receipt_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    if not exists (select 1 from public.order_installments where order_id = new.id) then
      insert into public.order_receipts (order_id, amount_usd)
      values (new.id, new.final_price_usd)
      on conflict (order_id) where installment_id is null do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- Self-heal / backfill, same reasoning as 0024/0029/0023's own versions of
-- this: an order or installment that was ALREADY 'paid' before this
-- migration ran never fired either trigger above. No-op today (orders and
-- order_installments are both empty), kept for correctness if this ever
-- runs against a non-empty environment.
insert into public.order_receipts (order_id, amount_usd)
select o.id, o.final_price_usd
from public.orders o
where o.status = 'paid'
  and not exists (select 1 from public.order_installments oi where oi.order_id = o.id)
  and not exists (select 1 from public.order_receipts r where r.order_id = o.id and r.installment_id is null)
on conflict (order_id) where installment_id is null do nothing;

insert into public.order_receipts (order_id, installment_id, amount_usd)
select oi.order_id, oi.id, oi.amount_usd
from public.order_installments oi
where oi.status = 'paid'
on conflict (installment_id) do nothing;

-- ------------------------------------------------------------------
-- Part D — get_or_create_order_receipt(), redesigned
--
-- Old 1-arg signature always resolved to "the order's one receipt" — that
-- assumption breaks the moment an order can have more than one
-- (multi-milestone installments). New 2-arg signature:
--   p_installment_id omitted/null + order has exactly one installment row
--     (every full_payment order) -> auto-resolves to that row, so every
--     existing caller (PaymentPanel's old flow is gone, but any other
--     single-payment caller) keeps working without passing anything new.
--   p_installment_id omitted/null + order has more than one installment
--     row -> raises, caller must specify which one.
--   p_installment_id set -> that specific installment's receipt.
--   Order has NO installment rows at all (legacy/Creative Agent path) ->
--     unchanged behavior from 0024, gated on orders.status = 'paid'.
--
-- Also now returns the full payment picture (project_total_usd/
-- paid_amount_usd/remaining_amount_usd/payment_status, straight from
-- get_order_payment_summary — 0043) alongside the per-document amount_usd,
-- so callers (the receipt PDF, primarily) can show "$150 paid on this
-- receipt, $150 of $300 total, $150 remaining" instead of just one number.
-- ------------------------------------------------------------------

drop function if exists public.get_or_create_order_receipt(uuid);

create or replace function public.get_or_create_order_receipt(
  p_order_id uuid,
  p_installment_id uuid default null
)
returns table (
  receipt_number text,
  created_at timestamptz,
  installment_id uuid,
  amount_usd numeric,
  installment_label text,
  project_total_usd numeric,
  paid_amount_usd numeric,
  remaining_amount_usd numeric,
  payment_status public.order_payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_installment record;
  v_installment_count int;
  v_summary record;
  v_resolved_installment_id uuid;
begin
  select client_id, status, final_price_usd into v_order from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not (public.is_owner_client(v_order.client_id) or public.is_admin()) then
    raise exception 'Not authorized to access this order''s receipt.';
  end if;

  select count(*) into v_installment_count
  from public.order_installments
  where order_id = p_order_id;

  select * into v_summary from public.get_order_payment_summary(p_order_id);

  if v_installment_count > 0 then
    v_resolved_installment_id := p_installment_id;

    if v_resolved_installment_id is null then
      if v_installment_count = 1 then
        select id into v_resolved_installment_id
        from public.order_installments
        where order_id = p_order_id;
      else
        raise exception 'This order has multiple installments — specify which one.';
      end if;
    end if;

    select * into v_installment
    from public.order_installments
    where id = v_resolved_installment_id and order_id = p_order_id;

    if v_installment is null then
      raise exception 'Installment not found for this order.';
    end if;
    if v_installment.status <> 'paid' then
      raise exception 'A receipt is only available once this installment has been verified.';
    end if;

    insert into public.order_receipts (order_id, installment_id, amount_usd)
    values (p_order_id, v_installment.id, v_installment.amount_usd)
    on conflict (installment_id) do nothing;

    return query
    select
      r.receipt_number,
      r.created_at,
      v_installment.id,
      v_installment.amount_usd,
      case
        when v_installment_count = 1 then 'Full Payment'
        else 'Installment ' || v_installment.sequence || ' of ' || v_installment_count
          || case when v_installment.sequence = v_installment_count then ' (Final)' else '' end
      end,
      v_summary.total_amount_usd,
      v_summary.paid_amount_usd,
      v_summary.remaining_amount_usd,
      v_summary.payment_status
    from public.order_receipts r
    where r.installment_id = v_installment.id;
  else
    if v_order.status <> 'paid' then
      raise exception 'A receipt is only available once payment has been verified.';
    end if;

    insert into public.order_receipts (order_id, amount_usd)
    values (p_order_id, v_order.final_price_usd)
    on conflict (order_id) where installment_id is null do nothing;

    return query
    select
      r.receipt_number,
      r.created_at,
      null::uuid,
      coalesce(r.amount_usd, v_summary.total_amount_usd),
      null::text,
      v_summary.total_amount_usd,
      v_summary.paid_amount_usd,
      v_summary.remaining_amount_usd,
      v_summary.payment_status
    from public.order_receipts r
    where r.order_id = p_order_id and r.installment_id is null;
  end if;
end;
$$;

grant execute on function public.get_or_create_order_receipt(uuid, uuid) to authenticated;
