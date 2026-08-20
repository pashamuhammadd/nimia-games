-- ============================================================
-- 0054: Telegram account linking — the Telegram counterpart to
-- 0025_discord_account_linking.sql. First slice of the Telegram Bot +
-- Mini App integration described in docs/TELEGRAM.md (§7 Authentication
-- Flow, §8 Database Integration) — links a Nimia `clients` row to a
-- Telegram user id so the client-facing bot/Mini App knows which account
-- a given Telegram user is. The Mini App session bridge
-- (apps/miniapp/app/api/telegram/session/route.ts) and the linking flow
-- (apps/miniapp/app/api/telegram/link/route.ts) both depend on this
-- column existing first, exactly the same dependency order 0025
-- established for Discord.
--
-- No new hosting/process needed: per docs/TELEGRAM.md, the client-facing
-- Telegram bot is a webhook-driven serverless route (apps/miniapp), same
-- "no persistent Gateway/long-polling" shape as the Discord bot.
-- ============================================================

-- telegram_user_id stored as TEXT (not bigint) — same reasoning as
-- discord_user_id (0025): nothing here ever does numeric arithmetic on
-- it, and keeping it a string end-to-end avoids any risk of a JS/JSON
-- number-precision issue anywhere in the stack (Telegram user ids are
-- currently well within JS's safe integer range, but there's no reason
-- to depend on that staying true — see packages/telegram/src/webapp-auth.ts's
-- own comment on this). telegram_username is optional — not every
-- Telegram user has one set. telegram_photo_url is best-effort, only
-- present in Telegram's initData when the user has a public profile
-- photo. Nothing security-relevant ever keys off either of these two,
-- only telegram_user_id does (same rule as Discord's username/avatar).
alter table public.clients
  add column telegram_user_id text,
  add column telegram_username text,
  add column telegram_photo_url text,
  add column telegram_connected_at timestamptz;

-- Partial unique index, not a plain UNIQUE column — see 0025's identical
-- comment: a plain UNIQUE would reject every row past the first once
-- more than one client has telegram_user_id = null (not yet connected).
-- Also doubles as the guard against two different Nimia clients somehow
-- ending up linked to the same Telegram account.
create unique index clients_telegram_user_id_key
  on public.clients (telegram_user_id)
  where telegram_user_id is not null;

-- ------------------------------------------------------------------
-- connect_telegram_account / disconnect_telegram_account
-- ------------------------------------------------------------------
--
-- SECURITY DEFINER, same reasoning as connect_discord_account (0025):
-- the clients_update_self_or_admin RLS policy (0006) only checks row
-- ownership, not which COLUMNS a client can touch on their own row.
-- Without this function a client could skip the real verification (a
-- server-verified Telegram Mini App initData — see docs/TELEGRAM.md §7
-- and §16, the Telegram analogue of Discord's OAuth code exchange) and
-- claim any telegram_user_id string directly via a raw Supabase update.
-- Routing through this function means the only callers that can ever
-- set these columns are apps/miniapp's own /api/telegram/link route
-- (first-time linking, right after a real password login) and
-- /api/telegram/session route (returning-user session bridge) — both
-- only ever act on the CALLING user's own row (`where user_id =
-- auth.uid()`), never an arbitrary one.
create or replace function public.connect_telegram_account(
  p_telegram_user_id text,
  p_telegram_username text,
  p_telegram_photo_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients
  set
    telegram_user_id = p_telegram_user_id,
    telegram_username = p_telegram_username,
    telegram_photo_url = p_telegram_photo_url,
    telegram_connected_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'No client profile found for the current user.';
  end if;
end;
$$;

-- Lets a client unlink their own account (Mini App Account tab
-- "Disconnect Telegram" button) — mirrors apps/app's Profile page
-- Discord disconnect. Deliberately does not attempt to notify the bot
-- or do anything Telegram-side; there is nothing to revoke on Telegram's
-- end for a Mini App session the way there is an OAuth grant to revoke
-- for Discord.
create or replace function public.disconnect_telegram_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients
  set
    telegram_user_id = null,
    telegram_username = null,
    telegram_photo_url = null,
    telegram_connected_at = null
  where user_id = auth.uid();
end;
$$;

-- Both functions run as their definer but only ever touch the CALLING
-- user's own row (`where user_id = auth.uid()`), so granting execute to
-- authenticated is safe — same reasoning as connect_discord_account (0025).
grant execute on function public.connect_telegram_account(text, text, text) to authenticated;
grant execute on function public.disconnect_telegram_account() to authenticated;
