-- ============================================================
-- 0051: Client-chosen installment plan (2x / 3x) + tiered fees
--
-- Reverses the 12 Agustus 2026 product decision (0038) that Admin picks
-- the milestone schedule during review. Per the user's explicit request
-- (18 Agustus 2026):
--   1. The CLIENT picks 2 or 3 installments themselves at order time, not
--      Admin during review.
--   2. 3 installments must cost MORE than 2 installments (a single flat
--      fee for both was the old behavior — see 0038's `fee_percentage`).
--   3. Admin no longer determines the installment plan/price at all —
--      Admin's only job on the payment side is verifying a submitted
--      payment (unchanged, see verifyInstallmentPaymentAction in
--      apps/admin/app/(protected)/orders/actions.ts, not touched here).
--
-- Business numbers confirmed by the user (18 Agustus 2026, via
-- AskUserQuestion):
--   - 2 Installments: +20% flexibility fee, split 60/40 (Project Start /
--     Before Final Delivery).
--   - 3 Installments: +30% flexibility fee, split 40/30/30 (Project
--     Start / Project Milestone / Final Delivery).
--   - Deadline auto-computed elsewhere (application code, no schema
--     change needed — see apps/app/modules/order/pricing/
--     estimate-deadline.ts) as order submission date + estimated
--     delivery days, calendar-day basis.
--
-- `payment_plan = 'custom'` (large bespoke projects, product decision #4
-- from 0038) is UNCHANGED — Admin can still hand-set a custom split for
-- those rare cases via setOrderPaymentPlanAction; this migration only
-- removes Admin's involvement in the STANDARD two/three-milestone choice,
-- which the client now makes themselves in the wizard (see
-- apps/app/modules/order/components/payment-method-step.tsx).
--
-- PREREQUISITE — extends public.installment_settings and the
-- derive_order_normal_price/materialize_order_installments trigger
-- functions from 0038. Run after 0038 (and everything after it).
-- ============================================================

-- ------------------------------------------------------------------
-- installment_settings: one flat `fee_percentage` becomes two tiered
-- columns. The old column existed as a single admin-configurable knob;
-- now there are two, one per standard plan, so 3 installments can be
-- priced higher than 2 by design rather than by admin discipline. Both
-- still admin-configurable (installment_settings_admin_write policy,
-- unchanged from 0038) — Admin can retune the STUDIO-WIDE rate, just
-- never a single order's plan.
-- ------------------------------------------------------------------

alter table public.installment_settings
  add column fee_percentage_two_milestones numeric(5, 2) not null default 20.00
    check (fee_percentage_two_milestones >= 0 and fee_percentage_two_milestones < 100),
  add column fee_percentage_three_milestones numeric(5, 2) not null default 30.00
    check (fee_percentage_three_milestones >= 0 and fee_percentage_three_milestones < 100),
  add constraint installment_settings_three_gte_two
    check (fee_percentage_three_milestones >= fee_percentage_two_milestones);

comment on column public.installment_settings.fee_percentage_two_milestones is
  'Flexibility fee for a 2-installment plan (60/40 split, see materialize_order_installments below). Default 20% — the user''s 18 Agustus 2026 product decision, replacing 0038''s single flat fee_percentage.';
comment on column public.installment_settings.fee_percentage_three_milestones is
  'Flexibility fee for a 3-installment plan (40/30/30 split). Default 30%. Constrained (installment_settings_three_gte_two) to never be lower than the 2-installment fee — 3 installments is strictly the more expensive, more flexible option, per the user''s explicit request.';

drop function if exists public.get_installment_fee_percentage();

alter table public.installment_settings drop column fee_percentage;

-- ------------------------------------------------------------------
-- get_installment_fee_percentage(plan) — plan-aware replacement for
-- 0038's zero-argument version. 'custom'/'none' fall back to the
-- three-milestone rate: 'custom' is Admin's own bespoke override (Admin
-- sets a real price for those separately, this is only a fallback for
-- normal_price_usd derivation) and 'none' should not normally reach here
-- once payment_plan is always explicitly set by the client wizard, but a
-- safe fallback beats a hard error on a stray legacy row.
-- ------------------------------------------------------------------

create or replace function public.get_installment_fee_percentage(p_plan public.order_payment_plan)
returns numeric
language sql
stable
as $$
  select case p_plan
    when 'two_milestones' then fee_percentage_two_milestones
    else fee_percentage_three_milestones
  end
  from public.installment_settings where id = true;
$$;

grant execute on function public.get_installment_fee_percentage(public.order_payment_plan) to authenticated, anon;

-- ------------------------------------------------------------------
-- derive_order_normal_price — same trigger as 0038, now reads the
-- plan-aware fee instead of the flat one.
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
      new.normal_price_usd := round(
        new.final_price_usd / (1 + public.get_installment_fee_percentage(new.payment_plan) / 100),
        2
      );
    else
      new.normal_price_usd := new.final_price_usd;
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- materialize_order_installments — same trigger as 0038, splits updated
-- per the 18 Agustus 2026 decision: two_milestones 50/50 -> 60/40,
-- three_milestones 30/30/40 -> 40/30/30. Milestone labels unchanged
-- (still make sense under the new splits). 'custom' branch (Admin's
-- bespoke override) and the 'none' -> two_milestones fallback are both
-- untouched.
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

  -- installments — 'none' falls back to the default (now Two
  -- Milestones, 60/40) rather than blocking the flow. Standard orders
  -- should never actually hit this fallback anymore since the client
  -- wizard always sets payment_plan explicitly when payment_method is
  -- 'installments' (see submit-order-action.ts/submit-custom-order-
  -- action.ts) — kept as a safety net for any stray legacy row.
  v_plan := case when new.payment_plan = 'none' then 'two_milestones' else new.payment_plan end;

  if v_plan = 'two_milestones' then
    v_pct := array[60, 40];
    v_labels := array['Project Start', 'Before Final Delivery'];
  elsif v_plan = 'three_milestones' then
    v_pct := array[40, 30, 30];
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
      -- function's own header comment / 0038's original spec section 23.
      v_amount := round(v_total - v_running, 2);
    end if;
    -- Explicit ::public.installment_status cast (carried over from 0049's
    -- fix) — a bare CASE expression over only string literals resolves to
    -- `text`, which Postgres will not implicitly cast to a user-defined
    -- enum column. Losing this cast when rewriting this function's body
    -- here would silently reintroduce 0049's exact bug for every
    -- installment order.
    insert into public.order_installments (order_id, sequence, label, percentage, amount_usd, status)
    values (
      new.id, i, v_labels[i], v_pct[i], v_amount,
      (case when i = 1 then 'pending_payment' else 'scheduled' end)::public.installment_status
    );
  end loop;

  return new;
end;
$$;

-- No trigger DROP/CREATE needed — orders_derive_normal_price and
-- orders_materialize_installments (both 0038) already point at these
-- function names; CREATE OR REPLACE above is enough to swap the bodies.
