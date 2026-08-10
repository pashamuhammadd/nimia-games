-- ============================================================
-- 0026: Discord auto-thread-per-order — docs/DISCORD.md's "Order thread
-- system": "Every new order from the website automatically creates a
-- Discord Thread ... The thread is that project's full timeline — it
-- only ever shows updates, it's never where the project is managed."
--
-- Second pass of the notifications phase (0025 was account linking,
-- 9 Agustus 2026 first pass added the plain channel notifications). This
-- adds the one column every later notify* call needs to know WHICH
-- thread to also post an update into — see @nimia/discord's
-- src/notify.ts (updated in this same pass) for how `threadId` flows
-- through notifyNegotiationUpdate / notifyPaymentSubmitted /
-- notifyPaymentVerified / notifyPaymentFlagged.
-- ============================================================

alter table public.orders
  add column discord_thread_id text;

comment on column public.orders.discord_thread_id is
  'Discord thread (channel) id created by notifyNewOrder (@nimia/discord) right after this order is created, via createThreadFromMessage. Null if the order predates this column, or if thread creation failed (Discord down/misconfigured/never set up) — every notify* caller treats null as "this order has no thread", never retries automatically, and the operational channel notification still goes out either way.';

-- ------------------------------------------------------------------
-- set_order_discord_thread_id
-- ------------------------------------------------------------------
--
-- SECURITY DEFINER — orders_update_admin_only (0006_rls_policies.sql)
-- blocks clients from UPDATE-ing `orders` directly at all (0020 dropped
-- the one client-side exception that used to exist, for payment
-- submission). submitOrderAction (apps/studio) still needs to persist the
-- thread id it just got back from notifyNewOrder, immediately after
-- inserting the order it just created — this is that one narrowly-scoped
-- write, same "kolom tidak dikunci" precaution as every other Discord RPC
-- in this schema (see 0025's own comment): a client can only ever set
-- this on an order that's THEIRS (via clients.user_id = auth.uid()),
-- never on anyone else's, and it touches nothing money/status-related.
-- Also callable by admin (is_admin()) in case a thread ever needs to be
-- re-created/relinked manually later.
create or replace function public.set_order_discord_thread_id(
  p_order_id uuid,
  p_thread_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set discord_thread_id = p_thread_id
  where id = p_order_id
    and (
      client_id in (select id from public.clients where user_id = auth.uid())
      or public.is_admin()
    );

  if not found then
    raise exception 'Order not found or not owned by the current user.';
  end if;
end;
$$;

grant execute on function public.set_order_discord_thread_id(uuid, text) to authenticated;
