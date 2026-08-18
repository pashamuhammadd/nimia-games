-- ============================================================
-- 0049: Fix materialize_order_installments() — "column status is of
-- type installment_status but expression is of type text"
--
-- BUG (found 18 Agustus 2026 during Fase 13 click-testing, admin clicking
-- "Send for Payment" on a cicilan/installments order): the loop that
-- inserts each milestone row (0038_custom_order_installments.sql, inside
-- materialize_order_installments()) built the `status` value with
--
--   case when i = 1 then 'pending_payment' else 'scheduled' end
--
-- Postgres's type-resolution rule for CASE/COALESCE-style expressions is:
-- when every branch is an untyped string literal, the WHOLE expression
-- resolves to `text` (not the special "unknown" pseudo-type a bare
-- literal has). A bare `'pending_payment'` literal in a VALUES list gets
-- an automatic assignment-cast to whatever the target column's type is
-- (that's why the sibling `full_payment` branch a few lines above, which
-- inserts the literal `'pending_payment'` directly with no CASE wrapper,
-- has always worked fine) — but once wrapped in a CASE, the expression is
-- concretely `text`, and Postgres has no IMPLICIT cast from `text` to a
-- user-defined enum like `installment_status`. Hence the exact error the
-- user hit: "column \"status\" is of type installment_status but
-- expression is of type text".
--
-- This ONLY affected the `installments` (cicilan) payment method's
-- two_milestones/three_milestones/custom branch — never `full_payment`,
-- which matches exactly what the user reported (bug appeared specifically
-- when testing a cicilan order, with the price for the current milestone
-- ($162.5) already computed and shown in the admin panel, but the INSERT
-- itself failing).
--
-- FIX: cast the CASE expression's result to public.installment_status
-- explicitly — `(case when i = 1 then 'pending_payment' else 'scheduled'
-- end)::public.installment_status`. Everything else in the function is
-- IDENTICAL to 0038's version; this is a single-line fix, shipped as a
-- new migration (not an edit to 0038) because 0038 is already applied in
-- production — CREATE OR REPLACE FUNCTION here overwrites the buggy
-- function body in place. No trigger changes needed: the existing
-- `orders_materialize_installments` trigger already points at this
-- function by name, so replacing the function body is sufficient.
--
-- Safe to re-run. No schema change, no data migration — purely a bugfix
-- to a trigger function. Any order that already hit this error had ITS
-- INSERT rolled back entirely (the whole `orders` UPDATE transaction
-- fails), so there is no partial/corrupt order_installments data to clean
-- up from the failed attempt(s) — the order simply never left
-- 'quotation_sent'/'negotiating' and Admin can just click "Send for
-- Payment" again after this migration runs.
-- ============================================================

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
    -- THE FIX (see this migration's own header comment): explicit
    -- ::public.installment_status cast — a bare CASE expression over only
    -- string literals resolves to `text`, which Postgres will not
    -- implicitly cast to a user-defined enum column.
    insert into public.order_installments (order_id, sequence, label, percentage, amount_usd, status)
    values (
      new.id, i, v_labels[i], v_pct[i], v_amount,
      (case when i = 1 then 'pending_payment' else 'scheduled' end)::public.installment_status
    );
  end loop;

  return new;
end;
$$;
