-- ============================================================
-- 0037: notify the client when their order is directly converted to a
-- project (the legacy quotation_sent -> "Convert to Project" path)
--
-- Bug found in the 12 Agustus 2026 order-flow audit:
-- notify_on_order_status_change() (0032) has a branch for every order
-- status transition a client should hear about EXCEPT 'converted' —
-- convertToProjectAction (apps/admin/app/(protected)/orders/actions.ts)
-- moves an order straight from 'quotation_sent' to 'converted', skipping
-- the crypto-payment flow entirely (kept for orders handled outside that
-- system — see that action's own comment), and the client got silently
-- nothing: no bell notification at all for their order actually starting.
-- Every other terminal/near-terminal transition (paid, rejected) already
-- notifies; this was the one gap.
--
-- CREATE OR REPLACE on the existing trigger function — no new trigger
-- needed, orders_notify_after_status_change (0032) already fires on every
-- `orders` UPDATE and will pick up this new branch immediately.
-- ============================================================

create or replace function public.notify_on_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_code text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_order_code := 'ORD-' || upper(substring(new.id::text from 1 for 8));

  if new.status = 'quotation_sent' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Quotation ready',
      'Your quotation for ' || v_order_code || ' is ready to review.', '/dashboard/orders'
    );
  elsif new.status = 'awaiting_payment' and old.status = 'payment_submitted' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Payment needs attention',
      coalesce('Your payment for ' || v_order_code || ' could not be verified: ' || new.payment_underpaid_note,
               'Your payment for ' || v_order_code || ' could not be verified. Please check your dashboard.'),
      '/dashboard/orders'
    );
  elsif new.status = 'awaiting_payment' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Ready for payment',
      'The price for ' || v_order_code || ' is agreed — you can now submit payment.', '/dashboard/orders'
    );
  elsif new.status = 'rejected' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Order declined',
      'Your order ' || v_order_code || ' was declined. Contact support if you have questions.', '/dashboard/orders'
    );
  elsif new.status = 'payment_submitted' then
    perform public.notify_staff(
      'order_payment_submitted', 'Payment submitted for review',
      'A payment for ' || v_order_code || ' is waiting for verification.', '/orders'
    );
  elsif new.status = 'paid' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Payment verified',
      'Your payment for ' || v_order_code || ' has been verified. Your project is starting soon!', '/dashboard/orders'
    );
  -- Added 0037 — the one transition that previously fell through this
  -- if/elsif chain with no branch at all (see this migration's header).
  elsif new.status = 'converted' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Project started',
      'Your order ' || v_order_code || ' has been approved and production is starting!', '/dashboard/projects'
    );
  end if;

  return new;
end;
$$;

-- Trigger itself is unchanged (still fires after update on public.orders,
-- for each row) — CREATE OR REPLACE above already repoints it at the new
-- function body, nothing to re-create here.
