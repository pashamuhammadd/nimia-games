-- ============================================================
-- 0029: auto-create a project when an order becomes 'paid'
--
-- Gap found while building the real Projects page (10 Agustus 2026):
-- convertToProjectAction (apps/admin/app/(protected)/orders/actions.ts)
-- already inserts into `projects` — but ONLY for the legacy
-- quotation_sent -> "Convert to Project" button, which skips payment
-- entirely (kept for orders handled outside the crypto-payment system).
-- The CURRENT, primary money flow — negotiating/quotation_sent ->
-- awaiting_payment -> payment_submitted -> paid (0012/0013) — has NO path
-- that ever creates a project: OrderDetailPanel.tsx only renders a receipt
-- download link once status='paid', no conversion step at all. So every
-- order that actually goes through real payment today has nowhere to
-- become a project.
--
-- Mirrors orders_create_receipt_on_paid (0024) exactly: fires on the
-- UPDATE transition into 'paid', SECURITY DEFINER, idempotent via
-- `on conflict` (projects.order_id is UNIQUE, see 0003_orders_projects.sql).
-- New project starts at status='paid' (not the column default
-- 'pending_review') since payment is, at this point, already done —
-- project_updates' first row (via log_project_status_change, 0003) then
-- correctly reads "Payment Confirmed" instead of "Order Created".
-- ============================================================

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
    values (new.id, new.client_id, v_title, 'paid')
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_create_project_after_paid on public.orders;

create trigger orders_create_project_after_paid
  after update on public.orders
  for each row execute function public.orders_create_project_on_paid();

-- Self-heal / backfill: an order that was ALREADY 'paid' before this
-- migration ever ran never fired the trigger above — same class of gap
-- 0023/0024 already fixed for Quests/Receipts (self-healing on read there;
-- a one-time backfill here since projects aren't generated lazily on
-- view). Safe to re-run: the `on conflict (order_id) do nothing` makes
-- this idempotent.
insert into public.projects (order_id, client_id, title, status)
select
  o.id,
  o.client_id,
  coalesce(s.name || ': ', '') || left(o.description, 40),
  'paid'
from public.orders o
left join public.services s on s.id = o.service_id
where o.status = 'paid'
on conflict (order_id) do nothing;
