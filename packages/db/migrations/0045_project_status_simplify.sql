-- ============================================================
-- 0045: State Architecture — simplify project_status 10 -> 7
--
-- This is the piece of the 16 Agustus 2026 refactor brief that got skipped
-- when Fase 1/2 (Payment/Invoice Architecture, migrations 0043-0044) jumped
-- straight to Payment — the user's own brief numbered this step #2, BEFORE
-- Payment Architecture. Caught and corrected same day: this migration is
-- that missing step, done now before moving on to Fase 5/6/7.
--
-- Target state machine (user's original spec, 16 Agustus 2026 brief):
--   NEW / APPROVED / IN_PRODUCTION / REVISION / READY_FOR_DELIVERY /
--   COMPLETED / CANCELLED — written here in this schema's existing
--   lowercase_snake_case convention (new/approved/in_production/revision/
--   ready_for_delivery/completed/cancelled), matching every other enum in
--   this codebase (order_status, installment_status, order_payment_status,
--   ...). The brief's own UPPERCASE is spec notation, not a literal
--   implementation requirement — switching case here would be pure
--   inconsistency with zero benefit.
--
-- Explicitly kept SEPARATE from Payment Status (order_payment_status,
-- 0043_order_payment_summary.sql) — this is the exact conflation the audit
-- flagged as technical debt (product decision 12 Agst: "installment #1
-- lunas = order 'paid'" widened the meaning of order-level 'paid' without
-- ever introducing a real payment-status dimension). Deliberately NOT
-- naming any project_status value "paid" or "approved_and_paid" or similar
-- — a project's production status and an order's payment status are two
-- different questions answered by two different enums, queried
-- separately, and (per the Implementation Order in FASE0-AUDIT.md) will be
-- shown side-by-side in the UI starting at Fase 8 (client dashboard),
-- not merged into one value here.
--
-- Mapping (10 old -> 7 new), decided by matching intent, not string
-- similarity:
--   pending_review  -> new                (brand new, nothing decided yet)
--   quotation       -> new                (DEAD VALUE — see below)
--   waiting_payment -> new                (DEAD VALUE — see below)
--   paid            -> approved           (payment confirmed, cleared to start)
--   planning        -> approved           (still pre-active-work; collapses
--                                           with 'paid' into one "cleared to
--                                           start" stage — this is the one
--                                           deliberate 2-into-1 collapse
--                                           needed to get from 8 LIVE values
--                                           down to 7, see below)
--   in_progress     -> in_production      (actively being worked on)
--   revision        -> revision           (unchanged)
--   final_review    -> ready_for_delivery (internally done, wrapping up
--                                           before handoff)
--   completed       -> completed          (unchanged)
--   cancelled       -> cancelled          (unchanged)
--
-- Reachability check (done before writing this, not assumed): grepped
-- every INSERT/UPDATE that touches projects.status or project_updates.
-- 'quotation' and 'waiting_payment' are NEVER actually written anywhere —
-- projects.status only ever gets set by (a) the column DEFAULT
-- ('pending_review', used by convertToProjectAction's legacy
-- skip-payment path, which never inserts a status explicitly), (b)
-- orders_create_project_on_paid (0029, hardcodes 'paid' -> redefined
-- below to 'approved'), or (c) a manual admin update via
-- updateProjectStatusAction (generic, no hardcoded value, populated from
-- PROJECT_STATUS_META's keys in the UI — updated in the same commit as
-- this migration). So those 2 values were always dead schema residue from
-- the original 0001 enum definition, matching the audit's own finding
-- (FASE0-AUDIT.md line 39).
--
-- Production `projects`/`project_updates` are BOTH EMPTY (confirmed via
-- user-run SQL during Fase 0/1, 15 Agustus 2026) — the USING-clause data
-- migration below touches zero existing rows in practice. Written to be
-- correct regardless.
-- ============================================================

-- ------------------------------------------------------------------
-- Part A — swap the enum type
-- ------------------------------------------------------------------

alter type public.project_status rename to project_status_old;

create type public.project_status as enum (
  'new',
  'approved',
  'in_production',
  'revision',
  'ready_for_delivery',
  'completed',
  'cancelled'
);

-- projects.status: drop the old-type default before the column type
-- change (a default expression typed against the old enum would otherwise
-- block ALTER COLUMN ... TYPE), migrate every existing value through the
-- mapping above, then set the new default.
alter table public.projects
  alter column status drop default;

alter table public.projects
  alter column status type public.project_status
  using (
    case status::text
      when 'pending_review'  then 'new'
      when 'quotation'       then 'new'
      when 'waiting_payment' then 'new'
      when 'paid'            then 'approved'
      when 'planning'        then 'approved'
      when 'in_progress'     then 'in_production'
      when 'revision'        then 'revision'
      when 'final_review'    then 'ready_for_delivery'
      when 'completed'       then 'completed'
      when 'cancelled'       then 'cancelled'
    end
  )::public.project_status;

alter table public.projects
  alter column status set default 'new'::public.project_status;

-- project_updates.from_status is nullable (null only for a brand-new
-- project's first row, see log_project_status_change, 0003) — the CASE
-- below returns null for a null input automatically (no ELSE needed,
-- Postgres CASE without ELSE returns null when nothing matches, which is
-- exactly right for from_status is null).
alter table public.project_updates
  alter column from_status type public.project_status
  using (
    case from_status::text
      when 'pending_review'  then 'new'
      when 'quotation'       then 'new'
      when 'waiting_payment' then 'new'
      when 'paid'            then 'approved'
      when 'planning'        then 'approved'
      when 'in_progress'     then 'in_production'
      when 'revision'        then 'revision'
      when 'final_review'    then 'ready_for_delivery'
      when 'completed'       then 'completed'
      when 'cancelled'       then 'cancelled'
    end
  )::public.project_status;

alter table public.project_updates
  alter column to_status type public.project_status
  using (
    case to_status::text
      when 'pending_review'  then 'new'
      when 'quotation'       then 'new'
      when 'waiting_payment' then 'new'
      when 'paid'            then 'approved'
      when 'planning'        then 'approved'
      when 'in_progress'     then 'in_production'
      when 'revision'        then 'revision'
      when 'final_review'    then 'ready_for_delivery'
      when 'completed'       then 'completed'
      when 'cancelled'       then 'cancelled'
    end
  )::public.project_status;

drop type public.project_status_old;

-- ------------------------------------------------------------------
-- Part B — redefine orders_create_project_on_paid (0029) to use the new
-- value name. Same trigger/function identity, CREATE OR REPLACE only —
-- the only change from 0029's version is the literal 'paid' -> 'approved'
-- in the INSERT and in the self-heal backfill SELECT below it.
-- ------------------------------------------------------------------

create or replace function public.orders_create_project_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_name text;
  v_title text;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select name into v_service_name from public.services where id = new.service_id;
    v_title := coalesce(v_service_name || ': ', '') || left(new.description, 40);

    insert into public.projects (order_id, client_id, title, status)
    values (new.id, new.client_id, v_title, 'approved')
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

-- Self-heal / backfill, same reasoning as 0029's own version: an order
-- that was ALREADY 'paid' before this migration ran (or before 0029 ever
-- ran) never fired the trigger above. No-op today (orders is empty), kept
-- for correctness if this ever runs against a non-empty environment.
insert into public.projects (order_id, client_id, title, status)
select
  o.id,
  o.client_id,
  coalesce(s.name || ': ', '') || left(o.description, 40),
  'approved'
from public.orders o
left join public.services s on s.id = o.service_id
where o.status = 'paid'
on conflict (order_id) do nothing;

-- ------------------------------------------------------------------
-- Part C — redefine notify_on_project_status_change (0032) with the new
-- label mapping. Same trigger/function identity, CREATE OR REPLACE only.
-- ------------------------------------------------------------------

create or replace function public.notify_on_project_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  v_label := case new.status::text
    when 'new' then 'New'
    when 'approved' then 'Approved'
    when 'in_production' then 'In Production'
    when 'revision' then 'Review Stage'
    when 'ready_for_delivery' then 'Ready for Delivery'
    when 'completed' then 'Completed'
    when 'cancelled' then 'Cancelled'
    else new.status::text
  end;

  perform public.notify_client_by_client_id(
    new.client_id, 'project_status',
    case when new.status = 'completed' then 'Project completed' else 'Project update' end,
    '"' || new.title || '" is now: ' || v_label,
    '/dashboard/projects'
  );

  return new;
end;
$$;
