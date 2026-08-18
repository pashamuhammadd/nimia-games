-- ============================================================
-- 0050: Fix get_or_create_order_receipt() — "column reference
-- \"installment_id\" is ambiguous"
--
-- BUG (found 18 Agustus 2026, Fase 13 click-testing — client clicked
-- "Receipt" on a paid installment, apps/app's
-- GET /api/orders/[id]/receipt?installment=... route, which calls this
-- RPC): PL/pgSQL implicitly declares every column of a `returns table
-- (...)` signature as an OUT variable inside the function body's
-- namespace. This function's `returns table (..., installment_id uuid,
-- ...)` (0044_invoice_architecture_cleanup.sql) means a bare, unqualified
-- `installment_id` anywhere inside the function's embedded SQL is
-- genuinely ambiguous between that OUT variable and
-- `order_receipts.installment_id`, the real table column — and this
-- applies to `ON CONFLICT` target/predicate clauses too, not just
-- ordinary SELECT/WHERE lists (confirmed by reproducing the exact error
-- against a live Postgres 16 instance while investigating this).
--
-- Two separate statements in the function hit this, both fixed here:
--
--   1. The per-installment branch's insert (hit by the reported bug):
--        on conflict (installment_id) do nothing;
--      `ON CONFLICT (col)` target lists cannot be dot-qualified with a
--      table alias, so instead this targets the unique CONSTRAINT by
--      name (`order_receipts_installment_id_key`, added by 0044)
--      instead of by bare column:
--        on conflict on constraint order_receipts_installment_id_key do nothing;
--
--   2. The legacy/no-installments branch's insert (not yet reported —
--      no order has hit this specific branch in testing yet, but it has
--      the IDENTICAL bug and would fail the exact same way the first
--      time any legacy full-payment order's receipt is fetched):
--        on conflict (order_id) where installment_id is null do nothing;
--      This targets a partial UNIQUE INDEX (`order_receipts_order_id_
--      legacy_key`, 0044), not a named constraint, so it can't use
--      `ON CONFLICT ON CONSTRAINT` — Postgres DOES allow the WHERE
--      predicate (unlike the target list) to be qualified, so this
--      aliases the insert target and qualifies the predicate column:
--        insert into public.order_receipts as r (...) ... on conflict (order_id) where r.installment_id is null do nothing;
--
-- Everything else in the function — parameter names (already correctly
-- `p_`-prefixed, no collision there), the `returns table` shape, the two
-- `return query ... where r.installment_id = ...` selects (already
-- alias-qualified, never ambiguous) — is UNCHANGED from 0044. Verified by
-- reproducing both failing statements against a live Postgres 16 instance
-- with this fix applied and confirming both branches (and repeat calls,
-- to check ON CONFLICT DO NOTHING idempotency) succeed.
--
-- No schema change — same signature, same return shape, same grant.
-- Ships as a new migration (not an edit to 0044) because 0044's version
-- of this function is already applied in production; CREATE OR REPLACE
-- overwrites the buggy body in place. Safe to re-run.
-- ============================================================

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

    -- THE FIX (part 1, see this migration's own header comment): target
    -- the named unique constraint instead of the bare column, which was
    -- ambiguous against this function's own `installment_id` OUT
    -- variable.
    insert into public.order_receipts (order_id, installment_id, amount_usd)
    values (p_order_id, v_installment.id, v_installment.amount_usd)
    on conflict on constraint order_receipts_installment_id_key do nothing;

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

    -- THE FIX (part 2, see this migration's own header comment): alias
    -- the insert target as `r` and qualify the ON CONFLICT WHERE
    -- predicate with it — the target list `(order_id)` itself can't be
    -- dot-qualified, but the partial-index predicate can, and doing so
    -- resolves the same ambiguity against the `installment_id` OUT
    -- variable.
    insert into public.order_receipts as r (order_id, amount_usd)
    values (p_order_id, v_order.final_price_usd)
    on conflict (order_id) where r.installment_id is null do nothing;

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
