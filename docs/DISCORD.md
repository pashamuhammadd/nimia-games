# Discord Integration

Architecture spec for Nimia Studio's official Discord server, and the plan
for connecting it to `studio.nimiagames.com` / `admin.nimiagames.com`. This
file existed only as conversational context with an AI assistant before 9
Agustus 2026 — moved into the repo so it doesn't depend on any one
session's memory. Read this before touching any Discord bot/webhook code.

## Core principle

The website (`studio.nimiagames.com`) is the single source of truth for
the whole system. The official Nimia Studio Discord server is ONLY:

- a **Notification Center**
- a **Support Center**
- an **Internal Activity Log**

Discord is never where data is managed or business processes run. Every
business decision (negotiation, approval, assignment) happens on the
Dashboard website, not in Discord. The bot never makes business decisions
— it only runs automation the website already decided on. All future
Discord work must follow this architecture.

## Why no persistent bot process (Gateway) is needed

Every responsibility below is the website reacting to something that
already happened (an order was created, a client connected their Discord
account, an admin verified a payment) and telling Discord about it — never
Discord telling the website something happened. That means every call is a
one-shot REST request using a bot token, made directly from a Next.js
server action / route handler in `apps/studio` or `apps/admin` — not a
long-running Gateway (websocket) connection. See `packages/discord/README.md`
for why this ruled out `discord.js` in favor of plain `fetch`, and why no
separate hosting (Railway/Render/VPS) is needed for any of this.

The only scenario that WOULD need either a persistent Gateway connection or
Discord's serverless-friendly Interactions HTTP endpoint is a command or
button *inside Discord itself* triggering an action — nothing in the spec
below currently needs that.

## Server purpose & roles

Not a community server. Only: 👑 Founder, 🛡 Admin, 🤝 Partner, ⭐ Client, 🤖
Bot. No Animator/Artist/Game Developer/Web Developer/Freelancer roles —
production is managed internally by Admin via the Dashboard.

## Server structure

- 📢 INFORMATION: `#welcome`, `#announcements`, `#how-to-start`
- 🎫 SUPPORT: `#create-ticket`
- 🤝 PARTNER PROGRAM: `#partner-announcements`, `#partner-rewards`, `#partner-support`
- 🔒 OPERATIONS: `#new-orders`, `#negotiations`, `#payment-verification`, `#system-log`

## Order thread system

Every new order from the website automatically creates a Discord Thread
(e.g. 📦 `NM-2026-00021`). The thread is that project's full timeline — it
only ever shows updates, it's never where the project is managed: Order
Created → Negotiation → Payment Submitted → Payment Verified → Production
Started → Revision → Delivery → Invoice Generated → Completed.

## Bot responsibilities

Send notifications (new order, negotiation, payment, invoice, delivery),
create order Threads automatically, send system activity logs, create
Support Tickets, grant Client/Partner roles. The bot never makes business
decisions.

## Client support

A "Support" button on the website → the bot creates a Private Ticket,
visible only to Founder + Admin + the Client who created it. No general
chat channel for support.

## Client/Partner registration

Client registers on the website → connects Discord via OAuth (website gets
the Discord User ID, username, avatar) → bot auto-assigns the ⭐ Client
role. If the user joins the Nimia Partner Program, the website updates
their status → bot auto-assigns the 🤝 Partner role (a user can hold both
Client and Partner roles at once).

## Order flow

Login to Dashboard → Start a Project → pick a service → fill the form →
submit → website creates the Order → Discord notification to `#new-orders`
→ bot creates a Thread → Admin reviews → Negotiation (via the website,
Discord is notification-only) → price agreed → Client pays → sends the TX
hash → Admin verifies → invoice generated automatically → project starts →
delivery → completed.

## Payment flow

Client picks a method (USDT/USDC/SOL/ETH/BSC/etc.) → website shows the
company wallet → client sends payment + TX hash → Discord notification to
`#payment-verification` → Admin verifies via the Dashboard → website
updates payment status, generates the invoice PDF, sends the email, and
shows a Dashboard notification. Discord only ever receives the "payment
verified" update after the fact.

## Negotiation & production

Negotiation happens 100% via the website (Discord is notification-only,
Admin's decision happens on the Dashboard, never in Discord). Project
assignment is manual, by Admin — no auto-assign or @mention to an
Animator/Developer/Artist; Discord only sends status updates.

## System log

`#system-log` records automated events: User Registered, Partner
Registered, Order Created, Negotiation Updated, Payment Submitted, Payment
Approved, Invoice Generated, Delivery Uploaded, Voucher Claimed, Referral
Commission, etc.

## Implementation status

**Done (9 Agustus 2026):** account linking — "Client connects Discord via
OAuth → bot auto-assigns the ⭐ Client role" from the Client/Partner
registration section above. See:

- `packages/db/migrations/0025_discord_account_linking.sql` — `clients.discord_user_id`/`discord_username`/`discord_avatar_url`/`discord_connected_at`, `connect_discord_account()` / `disconnect_discord_account()` RPCs.
- `packages/discord/` — the `@nimia/discord` package (OAuth + bot REST helpers).
- `apps/studio/app/api/discord/connect/route.ts` + `.../callback/route.ts` — the OAuth round trip.
- `apps/studio/app/dashboard/profile/page.tsx` — the "Connect Discord" / "Disconnect" UI.

**Done (9 Agustus 2026, second pass):** notifications to `#new-orders` /
`#negotiations` / `#payment-verification`, each mirrored as a short summary
to `#system-log` too. See `packages/discord/src/notify.ts` for every
`notify*` function (all deliberately never-throwing — a Discord outage or
bad channel ID never rolls back or fails the website action that triggered
it) and its own comment for exactly which docs/DISCORD.md event it covers.
Wired into:

- `apps/studio/modules/order/state/submit-order-action.ts` — `notifyNewOrder` on order creation.
- `apps/admin/app/(protected)/orders/actions.ts` — `notifyNegotiationUpdate` (sendQuotationForPaymentAction / acceptNegotiationOfferAction / sendCounterOfferAction / rejectNegotiationAction) and `notifyPaymentVerified` / `notifyPaymentFlagged` (verifyPaymentAction / flagUnderpaidPaymentAction).
- `apps/studio/app/dashboard/negotiations/actions.ts` — `notifyNegotiationUpdate` (accept/reject/counter, client side).
- `apps/studio/app/dashboard/orders/payment-actions.ts` — `notifyPaymentSubmitted` (submitPaymentAction).

**Done (9 Agustus 2026, third pass):** auto-thread-per-order — "Every new
order from the website automatically creates a Discord Thread". See:

- `packages/db/migrations/0026_discord_order_threads.sql` — `orders.discord_thread_id`, `set_order_discord_thread_id()` RPC (needed because `orders_update_admin_only` blocks a client-side raw `UPDATE` on `orders`).
- `packages/discord/src/rest.ts` — `sendChannelMessage` now returns the created message's id, `createThreadFromMessage()` (new) turns that message into a Thread.
- `packages/discord/src/notify.ts` — `notifyNewOrder` now creates the thread (hanging off the `#new-orders` notification message) and returns `{ threadId }`; `notifyNegotiationUpdate` / `notifyPaymentSubmitted` / `notifyPaymentVerified` / `notifyPaymentFlagged` all take an optional `threadId` and mirror a short line into it via the new `postToThread()` helper.
- Every call site that already fetches order fields for its notify* call now also selects `discord_thread_id` and passes it through — `apps/studio/modules/order/state/submit-order-action.ts` (creates + persists it), `apps/admin/app/(protected)/orders/actions.ts`, `apps/studio/app/dashboard/negotiations/actions.ts`, `apps/studio/app/dashboard/orders/payment-actions.ts`.

Threads only ever show updates (per the Order thread system section
above) — nothing reads FROM a thread, so this can't feed Discord-side
state back into a decision, same posture as every other notify* call.

**Not built yet** (all separate follow-up work, each independent of the
others once account linking + notifications + auto-thread above exist to
build on):

- Partner role auto-assign (needs a decision on what marks a client as an
  "active" partner for role purposes — `partners` rows are created for
  every signup per `0016_partner_program.sql`'s trigger, so "row exists"
  alone isn't the right signal; needs clarifying before implementing).
- `#system-log` events beyond the notifications-phase mirror above: User
  Registered, Partner Registered, Invoice Generated, Delivery Uploaded,
  Voucher Claimed, Referral Commission — each needs its own hook into the
  registration/invoice/delivery/voucher/referral code, none of which exist
  yet. `notifySystemLog()` (in `packages/discord/src/notify.ts`) is already
  exported and ready for these, just not called anywhere yet.
- Support ticket creation from a website "Support" button (the button
  itself doesn't exist yet either).
- `#welcome` / `#announcements` / `#how-to-start` / Partner Program
  channels — informational only, no automation planned for these.
- Thread updates for later lifecycle stages the spec mentions (Production
  Started / Revision / Delivery / Invoice Generated / Completed) — none of
  those website actions exist yet either (production/delivery tracking
  isn't built), so there's nothing to hook into yet.

## Server setup notes (manual, one-time)

- Bot Application created in the Discord Developer Portal, invited with
  `bot` scope + Manage Roles / Manage Channels / Send Messages / Create
  Private Threads / Create Public Threads / Embed Links / Read Message
  History permissions.
- **The bot's own auto-created role (named after the Application, e.g.
  "Nimia Studio" — NOT any manually-created "Bot" role that predates the
  actual bot account) must sit ABOVE Client and Partner in Server Settings
  → Roles**, or `assignGuildRole()` fails outright — Discord's permission
  model won't let a bot grant a role at or above its own highest role.
- OAuth2 redirect registered: `https://studio.nimiagames.com/api/discord/callback`
  (plus `http://localhost:3000/api/discord/callback` for local dev, as its
  own separate entry).
- **Support tickets (added 9 Agustus 2026): the 👑 Founder and 🛡 Admin
  roles need "Manage Threads" permission on the #create-ticket channel
  specifically** (Server Settings → the channel's own permission
  overrides, not the server-wide role permissions) — a PRIVATE thread
  (createPrivateThread, type 12) is invisible even to Founder/Admin unless
  either they have Manage Threads on that channel, or they're explicitly
  added as a thread member. Without this, staff would only ever see
  tickets for clients who happened to have Discord connected (the ones
  addThreadMember could actually add) — everyone else's ticket would be
  invisible to everyone. This is the one piece of this pass that can't be
  verified by testing as the client — please double-check it as Founder.

## Implementation status (support tickets)

**Done (9 Agustus 2026, fourth pass):** support tickets — "A 'Support'
button on the website → the bot creates a Private Ticket, visible only to
Founder + Admin + the Client who created it." See:

- `packages/db/migrations/0027_support_tickets.sql` — `support_tickets` table (denormalized client name/email snapshot, same convention as `orders`), `set_support_ticket_discord_thread_id()` RPC.
- `packages/discord/src/rest.ts` — `createPrivateThread()`, `addThreadMember()`, `archiveThread()`.
- `packages/discord/src/tickets.ts` (NEW) — `createSupportTicket()` (creates the private thread, posts the initial embed, adds the client if they've connected Discord) and `closeSupportTicketThread()` (archive + lock).
- `apps/studio/app/dashboard/support/` (NEW page + form + action) — reachable from the Topbar account dropdown (which used to link to a generic external Discord invite — replaced by this in-app flow, since "No general chat channel for support" was always the actual spec).
- `apps/admin/app/(protected)/tickets/` (NEW page + list + close action) — every open ticket, with a "Close Ticket" button and an "Open in Discord" deep link when a thread exists.
