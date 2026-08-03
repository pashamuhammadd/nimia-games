-- ============================================================
-- 0019: let a client accept/reject Nimia Studio's counter offer
--
-- Until now, once staff sent a counter offer (see
-- apps/admin/app/(protected)/orders/actions.ts#sendCounterOfferAction), the
-- client's dashboard (app/dashboard/negotiations) could only DISPLAY it —
-- there was no way to accept, reject, or counter back. Countering back is a
-- plain INSERT into order_negotiations, already covered by
-- order_negotiations_insert_own_or_admin (0013) — no new SQL needed for
-- that. Accepting/rejecting, though, needs to move `orders.status` (and
-- `final_price_usd` on accept), and orders_update_admin_only
-- (0006_rls_policies.sql) intentionally restricts a direct UPDATE on
-- `orders` to admin/staff/founder only.
--
-- Rather than loosen that policy (which would let a client update ANY
-- column on their own order, including ones they shouldn't touch), these
-- two SECURITY DEFINER functions are a narrow, purpose-built exception:
-- each re-verifies the caller actually owns the order (the same check
-- orders_select_own_or_admin/is_owner_client already uses) before doing
-- anything, so the RLS boundary isn't weakened — it's enforced by hand,
-- inside the one operation that's allowed.
-- ============================================================

create or replace function public.accept_negotiation_offer(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_latest_offer record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not public.is_owner_client(v_order.client_id) then
    raise exception 'Not authorized.';
  end if;
  if v_order.status <> 'negotiating' then
    raise exception 'This order is not currently under negotiation.';
  end if;

  select * into v_latest_offer
  from public.order_negotiations
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  -- Only an offer FROM staff can be accepted here — accepting your own
  -- most recent offer wouldn't mean anything, and this also protects
  -- against a stale/duplicate click landing between two of the client's
  -- own consecutive counter offers.
  if v_latest_offer is null or v_latest_offer.proposed_by <> 'staff' then
    raise exception 'There is no active counter offer to accept.';
  end if;

  update public.orders
  set status = 'awaiting_payment', final_price_usd = v_latest_offer.amount_usd
  where id = p_order_id;
end;
$$;

grant execute on function public.accept_negotiation_offer(uuid) to authenticated;

create or replace function public.reject_negotiation_offer(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not public.is_owner_client(v_order.client_id) then
    raise exception 'Not authorized.';
  end if;
  if v_order.status <> 'negotiating' then
    raise exception 'This order is not currently under negotiation.';
  end if;

  update public.orders set status = 'rejected' where id = p_order_id;
end;
$$;

grant execute on function public.reject_negotiation_offer(uuid) to authenticated;
