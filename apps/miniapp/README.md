# apps/miniapp — Telegram Mini App

Nimia Studio's Telegram Bot webhook + Mini App, described in full in
`docs/TELEGRAM.md` at the repo root. This README is the setup/testing
checklist specific to this app; read `docs/TELEGRAM.md` first for the
architecture and `packages/telegram/README.md` for how to obtain every
Telegram credential.

## What's real (Phase 0 + Phase 1 + Phase 2 of docs/TELEGRAM.md's roadmap)

- **Bot webhook** (`app/api/telegram/webhook/route.ts`) — `/start` with or
  without a deep-link payload, replies with the welcome message + main
  menu (or a single "Open Nimia Studio" button for a deep link). Sends a
  banner photo + services/Partner Program pitch when
  `TELEGRAM_WELCOME_IMAGE_URL` is configured, falling back to a plain
  text welcome otherwise (or if the photo send itself fails) — see
  `packages/telegram/README.md`'s "Welcome image" section.
- **Account linking migration** (`packages/db/migrations/0054`) —
  `clients.telegram_user_id` + `connect_telegram_account()` /
  `disconnect_telegram_account()` RPCs.
- **Auth bridge** (`app/api/telegram/session/route.ts` +
  `app/api/telegram/link/route.ts` + `app/components/TelegramLinkGate.tsx`)
  — first-time linking via real password login, returning-user silent
  session via Supabase's own magic-link admin API. This is the part
  docs/TELEGRAM.md flagged as highest difficulty (§17/§18) — test it
  first and most carefully.
- **Home, Services, Orders, Partner, Account** — all five tabs are real.
  - **Home** — greeting, total order count, partner balance, and the
    most recent order, each linking into its full tab.
  - **Services** — live catalog from `public.services` (RLS-scoped same
    as every other app), grouped by category. "Start a Project" opens
    the real Order Configurator (`app.nimiastudio.com/order`) instead of
    a second order form living here.
  - **Orders** — the client's own orders (RLS-scoped), with status
    badges. "Full details" links to `app.nimiastudio.com/dashboard/orders`
    for negotiation/payment/installments, none of which are
    reimplemented here.
  - **Partner** — referral link (copy + "Share on Telegram"), commission
    rate, referral/paid-client counts, pending/available/lifetime reward
    balances, and recent referral activity — all read via the SAME
    `get_partner_metrics` / `get_partner_referral_activity` /
    `partner_commission_rate` RPCs the full Partner Dashboard uses
    (`packages/db/migrations/0016_partner_program.sql`), not
    re-derived. Withdraw still only lives on the full dashboard.
  - **Account** — connect/disconnect Telegram, log out.

  Deliberately NOT reimplemented anywhere above: order creation/
  negotiation, payment submission, installment schedules, and partner
  withdrawal — all real, non-trivial flows that already exist in
  `apps/app`. Rebuilding them here would be exactly the "business logic
  duplicated 3+ places" trap this file used to warn about; every one of
  those actions instead opens the real page in the client's own browser
  (see `app/lib/links.ts`).
  One intentional gap: `app/lib/statusLabels.ts` keeps its own small
  copy of the order-status label/color map, since `apps/app`'s copy
  lives in a private `app/` directory this app can't import from. It's
  display-only (a wrong/missing label just shows the raw status string,
  never a wrong number) — worth extracting to a shared package
  eventually, not required to ship this pass.

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
     single highest-risk line in this whole pass (see that route's own
     "KNOWN GAP" comment about `verifyOtp`'s exact parameter shape,
     which could not be verified against a live Supabase project from
     the sandbox this was built in).
   - Account tab → "Disconnect Telegram" → confirm the Telegram row goes
     back to "Not connected", and that reopening the Mini App now asks
     to log in again (proves disconnect actually took effect, not just a
     UI toggle).

## Not done yet (see docs/TELEGRAM.md's roadmap for the rest)

Lifecycle notifications (order approved, payment confirmed, etc. —
`packages/telegram`'s `notify.ts` equivalent for the client-facing bot),
admin-side Telegram notifications, order creation/negotiation/payment
inside the Mini App itself, partner withdrawal inside the Mini App, and
every other "deferred" item docs/TELEGRAM.md §20 lists.
