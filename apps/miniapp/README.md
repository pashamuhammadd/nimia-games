# apps/miniapp — Telegram Mini App

Nimia Studio's Telegram Bot webhook + Mini App, described in full in
`docs/TELEGRAM.md` at the repo root. This README is the setup/testing
checklist specific to this app; read `docs/TELEGRAM.md` first for the
architecture and `packages/telegram/README.md` for how to obtain every
Telegram credential.

## What's real in this first pass (Phase 0 + Phase 1 of docs/TELEGRAM.md's roadmap)

- **Bot webhook** (`app/api/telegram/webhook/route.ts`) — `/start` with or
  without a deep-link payload, replies with the welcome message + main
  menu (or a single "Open Nimia Studio" button for a deep link).
- **Account linking migration** (`packages/db/migrations/0054`) —
  `clients.telegram_user_id` + `connect_telegram_account()` /
  `disconnect_telegram_account()` RPCs.
- **Auth bridge** (`app/api/telegram/session/route.ts` +
  `app/api/telegram/link/route.ts` + `app/components/TelegramLinkGate.tsx`)
  — first-time linking via real password login, returning-user silent
  session via Supabase's own magic-link admin API. This is the part
  docs/TELEGRAM.md flagged as highest difficulty (§17/§18) — test it
  first and most carefully.
- **Home** and **Account** tabs — real (Account shows connect/disconnect
  status; Home confirms the link worked).
- **Services / Orders / Partner** tabs — deliberately still "Coming
  soon" placeholders. Per docs/TELEGRAM.md's own roadmap, real data for
  these three is Phase 2, built on top of this auth bridge — see that
  file's §19 before wiring them up, and its §13 warning about NOT
  duplicating `modules/order`/`modules/partners` business logic a 4th/5th
  time (extract to a shared package first).

## Phase 0 setup checklist (do this before anything else)

1. `npm install` at the repo root (new workspace).
2. Run `packages/db/migrations/0054_telegram_account_linking.sql` in
   Supabase SQL editor.
3. Follow `packages/telegram/README.md`'s "Bagian 2" end to end: create
   the client-facing bot + Mini App in @BotFather, set every
   `TELEGRAM_*`/`NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY` env
   var from `.env.example` (local **and** this app's own Vercel project
   once deployed — this monorepo deploys each app as a separate Vercel
   project with independent env vars, a real gotcha that has bitten the
   Discord integration before, see project memory's discord_integration
   notes).
4. Deploy, then run `setWebhook` once (see packages/telegram/README.md).
5. Test `/start` in the bot's own chat — should get the welcome message +
   5-button menu, and tapping any button should open this app inside
   Telegram.
6. Test the auth bridge specifically:
   - First open (not linked yet) → should show the login form → log in
     with an existing Nimia account's email/password → should redirect
     into Home.
   - Close and reopen the Mini App (or clear this app's cookies) →
     should skip the login form entirely and land straight on Home —
     this exercises the `/api/telegram/session` magic-link path, the
     single highest-risk line in this whole pass. `verifyOtp`'s `type`
     param was fixed from `"magiclink"` to `"email"` (confirmed against
     Supabase's own docs — see that route's own comment) but was never
     exercised against a live Supabase project from the sandbox this
     was built in, so this is still the first thing to test carefully.
   - Account tab → "Disconnect Telegram" → confirm the Telegram row goes
     back to "Not connected", and that reopening the Mini App now asks
     to log in again (proves disconnect actually took effect, not just a
     UI toggle).

## Not done yet (see docs/TELEGRAM.md's roadmap for the rest)

Services/Orders/Partner real data, lifecycle notifications
(order approved, payment confirmed, etc. — `packages/telegram`'s
`notify.ts` equivalent for the client-facing bot), admin-side Telegram
notifications, and every "deferred" item docs/TELEGRAM.md §20 lists.
