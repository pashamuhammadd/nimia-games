-- ============================================================
-- 0025: Discord account linking — "Client connects Discord via OAuth,
-- bot auto-assigns the Client role" from docs/DISCORD.md's spec.
--
-- First slice of the Discord integration. Notification webhooks (#new-
-- orders, #payment-verification, #system-log), the auto-thread-per-order
-- system, and Support ticket creation are separate follow-up migrations/
-- features once this foundation (an actual client<->Discord account link)
-- exists to build on — none of those can auto-assign a role or DM the
-- right person without discord_user_id already being on file.
--
-- No new hosting/process needed for any of this: per docs/DISCORD.md,
-- the bot only ever ACTS (send message, assign role, create thread) in
-- response to something that already happened on the website — it never
-- listens for Discord-side events — so every call is a plain REST
-- request from a Next.js server action/route using a bot token
-- (@nimia/discord), not a persistent Gateway connection.
-- ============================================================

-- discord_user_id is the Discord snowflake ID (a stable numeric string
-- Discord itself hands back after OAuth) — NOT the username, which a
-- user can change at any time. discord_username/discord_avatar_url are
-- cached at connect time purely for display on the Profile page; nothing
-- security-relevant ever keys off them, only discord_user_id does.
alter table public.clients
  add column discord_user_id text,
  add column discord_username text,
  add column discord_avatar_url text,
  add column discord_connected_at timestamptz;

-- Partial unique index rather than a plain UNIQUE column constraint — a
-- plain UNIQUE would reject every row past the first once more than one
-- client has discord_user_id = null (not yet connected). Only actually-
-- connected accounts need to be distinct from each other; this also
-- doubles as the guard against two different Nimia clients somehow ending
-- up linked to the same Discord account.
create unique index clients_discord_user_id_key
  on public.clients (discord_user_id)
  where discord_user_id is not null;

-- ------------------------------------------------------------------
-- connect_discord_account / disconnect_discord_account
-- ------------------------------------------------------------------
--
-- SECURITY DEFINER, deliberately NOT left to the existing
-- clients_update_self_or_admin RLS policy (0006_rls_policies.sql) — that
-- policy checks ROW ownership only, it doesn't restrict which COLUMNS a
-- client can touch on their own row. Same "kolom tidak dikunci" gap
-- class closed for payment columns in 0020_lock_down_payment_rls.sql:
-- without this function, a client could skip the real Discord OAuth flow
-- entirely and fire a raw Supabase update claiming any discord_user_id
-- string they want (the partial unique index above would only stop them
-- from picking one someone else already claimed), and the bot would then
-- treat them as if they'd actually connected that account. Routing
-- through this function means the only caller that can ever set these
-- columns is apps/studio's own OAuth callback route
-- (app/api/discord/callback/route.ts), immediately after Discord itself
-- has verified the account via a real authorization-code exchange.
create or replace function public.connect_discord_account(
  p_discord_user_id text,
  p_discord_username text,
  p_discord_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients
  set
    discord_user_id = p_discord_user_id,
    discord_username = p_discord_username,
    discord_avatar_url = p_discord_avatar_url,
    discord_connected_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'No client profile found for the current user.';
  end if;
end;
$$;

-- Lets a client unlink their own account (Profile page "Disconnect"
-- button) — deliberately does NOT remove the Discord role itself here;
-- the caller (disconnectDiscordAction, apps/studio) is responsible for
-- also calling @nimia/discord's role-removal REST call with the
-- discord_user_id this function is about to null out, so it has to read
-- that value BEFORE calling this, not after.
create or replace function public.disconnect_discord_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients
  set
    discord_user_id = null,
    discord_username = null,
    discord_avatar_url = null,
    discord_connected_at = null
  where user_id = auth.uid();
end;
$$;

-- Both functions run as their definer (the migration-running role, same
-- as every other SECURITY DEFINER function in this schema) but only ever
-- touch the CALLING user's own row (`where user_id = auth.uid()`), so
-- granting execute to authenticated is safe — same reasoning as
-- apply_voucher_to_order (0021) and get_or_create_order_receipt (0024).
grant execute on function public.connect_discord_account(text, text, text) to authenticated;
grant execute on function public.disconnect_discord_account() to authenticated;
