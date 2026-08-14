# Discord Integration

Architecture spec for Nimia Studio's official Discord server, and the plan
for connecting it to `nimiastudio.com` / `hub.nimiastudio.com`. This
file existed only as conversational context with an AI assistant before 9
Agustus 2026 — moved into the repo so it doesn't depend on any one
session's memory. Read this before touching any Discord bot/webhook code.

## Core principle

The website (`nimiastudio.com`) is the single source of truth for
the whole system. The official Nimia Studio Discord server is ONLY:

- a **Notification Center**
- a **Support Center**
- an **Internal Activity Log**
- (since 11 Agustus 2026) a **Public Community + Partner Program social
  proof layer** — see "Public Community" and "Partner Discord Channel"
  below. Still never where data is managed or a business decision is made
  — the same core principle just extended to a public audience.

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
button *inside Discord itself* triggering an action. As of 12 Agustus 2026
one thing in the spec below now needs exactly that — see "In-Discord ticket
button" below — and it went with the Interactions HTTP endpoint, NOT a
Gateway connection: `apps/studio/app/api/discord/interactions/route.ts` is
an ordinary serverless route (same shape as the OAuth callback route),
Discord calls it once per click/submit and verifies it via a signed request
rather than a live socket, so this section's core claim ("no long-running
process, no separate hosting") still holds — only the *direction* of that
one route is new (inbound instead of outbound).

## Server purpose & roles

Started as a private server for Founder/Admin/Client/Partner only. Since 11
Agustus 2026 the server is OPEN TO THE PUBLIC (anyone can join) — but the
role set is unchanged: 👑 Founder, 🛡 Admin, 🤝 Partner, ⭐ Client, 🤖 Bot,
plus everyone else as a plain (roleless) member. Still no
Animator/Artist/Game Developer/Web Developer/Freelancer roles — production
is managed internally by Admin via the Dashboard, and this integration
never @mentions production staff (see "Order thread system" below).

## Server structure

- 📢 INFORMATION: `#welcome`, `#announcements`, `#how-to-start`
- 🌐 COMMUNITY (added 11 Agustus 2026, public): `#general`, `#ask-nimia`, `#project-ideas`
- 🎫 SUPPORT: `#create-ticket`
- 🤝 PARTNER PROGRAM (public since 11 Agustus 2026): `#partner-announcements`, `#partner-joined`, `#recent-rewards`, `#partner-leaderboard`, `#partner-success`, `#partner-support`
- 🔒 OPERATIONS (internal, staff-only): `#new-orders`, `#negotiations`, `#payment-verification`, `#system-log`

## Public Community

Added 11 Agustus 2026. Three plain informational channels, no bot
automation — every member can read and post in all three. Purely a
community/marketing layer (brief: "COMMUNITY + MARKETING + CLIENT
ACQUISITION + PARTNER ACQUISITION + SOCIAL PROOF"), set up manually in
Discord (categories/channels aren't something code creates — there's no
Discord API call anywhere in this integration that creates channels, only
ones that post into or thread off EXISTING channel ids configured via env
vars).

- `#general` — general chat about Nimia, game dev, animation, digital
  assets, website dev.
- `#ask-nimia` — pricing/workflow/service questions from prospective
  clients or partners.
- `#project-ideas` — members discuss project ideas; a natural place to
  spot prospective clients.

Deliberately NO `#showcase` channel — portfolio is video/animation, and a
public upload channel would let anyone download the full-resolution
originals. If a showcase is ever built, it should show short
preview/teaser clips only, through its own dedicated system — not part of
this phase.

## Order thread system

Every new order from the website automatically creates a Discord Thread
(e.g. 📦 `NM-2026-00021`). The thread is that project's full timeline — it
only ever shows updates, it's never where the project is managed: Order
Created → Negotiation → Payment Submitted → Payment Verified → Production
Started → Revision → Delivery → Invoice Generated → Completed.

## Bot responsibilities

Send notifications (new order, negotiation, payment, invoice, delivery),
create order Threads automatically, send system activity logs, create
Support Tickets, grant Client/Partner roles, and (since 11 Agustus 2026)
post Partner Program social-proof events to the public channels below. The
bot never makes business decisions.

## Client support

A "Support" button on the website → the bot creates a Private Ticket,
visible only to Founder + Admin + the Client who created it. No general
chat channel for support — `#ask-nimia` (Public Community, above) is for
general/pre-sales questions only, never account-specific support.

Since 12 Agustus 2026, a ticket can also be opened from **inside Discord
itself** — see "In-Discord ticket button" immediately below — as a second
entry point into the exact same `support_tickets` table and Private Thread
flow, not a separate ticket system.

## In-Discord ticket button

Added 12 Agustus 2026. A 🎫 **Open a Ticket** button, permanently pinned as
a message in `#create-ticket`, lets a client start a ticket without ever
leaving Discord — the counterpart to the website's own Support page
(`nimiastudio.com/dashboard/support`), not a replacement for it. Both
paths write to the same `support_tickets` table and produce the identical
kind of Private Thread; the admin Tickets page (`hub.nimiastudio.com/tickets`)
shows both with no distinction between them.

Flow: client clicks **Open a Ticket** → Discord shows a modal (Subject +
"How can we help?", mirroring the website form's two fields) → client
submits it → Discord POSTs the submission to this integration's
Interactions HTTP endpoint (`apps/studio/app/api/discord/interactions/route.ts`)
→ that route looks up which Nimia client this Discord account belongs to
(`clients.discord_user_id`, migration 0025), inserts the `support_tickets`
row, and calls the SAME `createSupportTicket()` (`packages/discord/src/tickets.ts`)
the website's own `createSupportTicketAction` calls → a private thread is
created in `#create-ticket`, the client is added to it, staff see it in
`#create-ticket` and on the admin Tickets page exactly like any other
ticket.

**This only works for a Discord account already connected to a Nimia
account** (Profile → Connect Discord, migration 0025) — the click itself
never creates an account or a guest ticket. Someone who clicks the button
without having connected Discord gets an ephemeral (only-they-can-see-it)
message telling them to log in on the website and connect Discord first,
then try again.

Technically, this is the one place in the whole integration that receives
an inbound request FROM Discord rather than only ever calling out to it —
see "Why no persistent bot process (Gateway) is needed" above for why this
still doesn't need a Gateway connection, and `packages/discord/src/interactions.ts`
for the Discord-side mechanics (signature verification, the button/modal
payloads, deferring the response since the actual work — client lookup,
ticket insert, thread creation — can plausibly cross Discord's 3-second
response window).

## Client/Partner registration

Client registers on the website → connects Discord via OAuth (website gets
the Discord User ID, username, avatar, and — since the 10 Agustus 2026
guild-join fix — a `guilds.join`-scoped access token) → bot adds the
client to the server if they aren't already a member → bot auto-assigns
the ⭐ Client role. Partner role auto-assign remains deferred (see
"Implementation status" below) — every account technically becomes a
Partner on signup (self-serve, migration 0016), so "row exists" was never
a valid signal for granting the 🤝 Partner Discord role; the gamification
phase below covers PUBLIC social-proof posts instead, which needed no role
decision (they're channel posts naming a partner, not a role grant).

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
verified" update after the fact. Since 11 Agustus 2026, THIS is also the
exact moment (verifyPaymentAction, apps/admin) that drives the Partner
Program gamification events below — see "Partner Discord Channel".

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

## Partner Discord Channel

Added 11 Agustus 2026 — the public-facing half of the Nimia Partner
Program, per the brief's own rule (section 25): only a **SUCCESSFUL PAID
REFERRAL** (a referred client whose payment has been verified AND
confirmed by an admin) ever produces a public post. Registration, a used
referral code, a submitted order, or an unverified/pending payment never
do — structurally guaranteed by WHERE this code runs, not just a naming
convention: every reward/level-up/leaderboard post below is only ever
triggered from `apps/admin/app/(protected)/orders/actions.ts`'s
`verifyPaymentAction`, the one function that flips `orders.status` to
`'paid'`.

- **`#partner-joined`** — 🎉 fires from `apps/studio/app/actions.ts`'s
  `signUpAction`, right after signup, but ONLY for signups that showed
  explicit partner intent (arrived via the `/partners` marketing page, or
  entered a referral code) — per an explicit product decision (11 Agustus
  2026), NOT every signup, even though every account technically becomes a
  Partner (self-serve, migration 0016). Posting this for every single
  registration would flood the channel with people who only ever wanted to
  order a service.
- **`#recent-rewards`** — 💰 fires from `verifyPaymentAction` whenever a
  referring partner's paid-clients count goes up. Shows the partner's
  display name, their new Successful Paid Referrals count, and their
  level. Per an explicit product decision (11 Agustus 2026), **never shows
  a dollar amount** — avoids indirectly revealing order prices or
  commission math to the public, brief section 11's "if reward amount is
  safe to show" question resolved as "no" here.
- **`#partner-leaderboard`** — 🏆 ONE pinned message, ranked by
  `get_partner_leaderboard_public()` (migration 0035 — SUCCESSFUL PAID
  REFERRALS only, never registration/click count, per brief section 13).
  Recomputed and the SAME message EDITED (never a new post) every time
  `#recent-rewards` fires — see "Leaderboard update strategy" in migration
  0035's own comments and `packages/discord/src/gamification.ts`'s
  `postOrUpdateLeaderboard`. The message id lives in
  `discord_leaderboard_state` (0035), a tiny singleton table — this is the
  one piece of Discord-side state the website itself tracks, and it's
  purely "which message am I supposed to edit next", never partner/reward
  data itself (that stays 100% in `partners`/`partner_rewards`, 0016).
- **`#partner-success`** — 🚀 fires from `verifyPaymentAction` only when a
  partner's resolved level actually changes (Bronze→Silver→Gold→Platinum).
  Per an explicit product decision (11 Agustus 2026), a level-up IS the
  milestone definition here — not an arbitrary round number of referrals.
- **`#partner-announcements`** / **`#partner-support`** — informational
  only, no automation (same as `#welcome`/`#announcements`/`#how-to-start`
  under INFORMATION).

**Displaying a partner publicly** — per an explicit product decision (11
Agustus 2026): if the partner has connected Discord (0025), an `<@id>`
mention is used (Discord renders their live server display name and pings
them); otherwise their site full name is used as a fallback (see
`resolvePublicPartnerName` in `packages/discord/src/gamification.ts`).
Never email, wallet address, or any other field from this integration's
"never send to public Discord" list (see Security below).

## Security

Never send to public Discord:
- email client
- wallet address / payment address
- TX hash
- invoice / full order form
- private project brief / negotiation details
- a client's payment amount if considered confidential
- any other private client information

Public Discord (including the gamification channels above) only ever
shows achievement/social proof: a partner's own display name, level, and
successful-paid-referral count — never a client's identity, an order's
details, or (per the 11 Agustus 2026 decision) a reward's dollar amount.

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

**Done (11 Agustus 2026, gamification phase):** Public Community
(informational, no code — see "Public Community" above, set up manually in
Discord) + the full Partner Discord Channel section above. See:

- `packages/db/migrations/0035_discord_partner_gamification.sql` — `discord_leaderboard_state` (singleton table, the pinned leaderboard message id), `get_referring_partner_id()`, `get_partner_discord_profile()`, `get_partner_leaderboard_public()` — all admin-gated RPCs, none of which touch or expose money/PII beyond what's already public-safe elsewhere in this schema.
- `packages/discord/src/gamification.ts` (NEW module, same never-throwing posture as notify.ts/tickets.ts) — `notifyPartnerJoined`, `notifyReferralReward`, `notifyPartnerLevelChanged`, `postOrUpdateLeaderboard`, `resolvePublicPartnerName`.
- `packages/discord/src/rest.ts` — new `editChannelMessage()` (PATCH an existing message — what makes the "one pinned leaderboard message, edited in place" requirement possible).
- `packages/discord/src/config.ts` — 4 new channel names: `partner-joined` / `recent-rewards` / `partner-leaderboard` / `partner-success`.
- `apps/studio/app/actions.ts` (`signUpAction`) — `notifyPartnerJoined` for explicit-intent signups. Also fixed a real pre-existing gap found while wiring this up: `joined_via_partner_page` was never actually being forwarded to `supabase.auth.signUp()`'s metadata, so migration 0030's Gold-rate floor for `/partners`-page signups was silently not being applied on the currently-deployed code — this migration and RegisterForm.tsx already expected it, this was the missing link.
- `apps/admin/app/(protected)/orders/actions.ts` (`verifyPaymentAction`) — snapshots the referring partner's paid-clients count BEFORE the payment-confirming UPDATE (has to happen before — the reward trigger recomputes it inside the same UPDATE statement), then after the update: `notifyReferralReward`, `notifyPartnerLevelChanged` (only on an actual level change), and a leaderboard refresh — all best-effort, wrapped so a Discord failure can never affect payment verification itself.
- `apps/admin/app/(protected)/partners/partner-level.ts` — `resolvePartnerLevelDisplay` gained the `joinedViaPartnerPage` floor parameter it was missing (a real pre-existing display gap, found and fixed while building the level-change comparison this phase needs) + new `nextPartnerLevelDisplay()`.

**Not built yet** (all separate follow-up work):

- Partner role auto-assign in Discord — still deferred, see "Client/Partner registration" above for why "row exists" was never the right signal; the gamification phase above didn't need to resolve this (it's public channel posts, not a role grant).
- `#system-log` events beyond the notifications-phase mirror: User
  Registered, Partner Registered, Invoice Generated, Delivery Uploaded,
  Voucher Claimed, Referral Commission — each needs its own hook into the
  registration/invoice/delivery/voucher/referral code, none of which exist
  yet. `notifySystemLog()` (in `packages/discord/src/notify.ts`) is already
  exported and ready for these, just not called anywhere yet.
- Support ticket creation from a website "Support" button (the button
  itself doesn't exist yet either).
- Thread updates for later lifecycle stages the spec mentions (Production
  Started / Revision / Delivery / Invoice Generated / Completed) — none of
  those website actions exist yet either (production/delivery tracking
  isn't built), so there's nothing to hook into yet.

## Server setup notes (manual, one-time)

- Bot Application created in the Discord Developer Portal, invited with
  `bot` scope + Manage Roles / Manage Channels / Send Messages / Create
  Private Threads / Create Public Threads / Embed Links / Read Message
  History / **Create Invite** permissions. (**Create Invite** added 10
  Agustus 2026 — required by `addGuildMember()`, see the guild-join entry
  below; if the bot was invited before this date, check Server Settings →
  Roles → the bot's own role → Permissions and grant it there if missing.)
  No NEW bot permission is needed for the 11 Agustus 2026 gamification
  phase — editing a message the bot itself posted (`editChannelMessage`)
  only ever needs Send Messages, which it already has.
- **The bot's own auto-created role (named after the Application, e.g.
  "Nimia Studio" — NOT any manually-created "Bot" role that predates the
  actual bot account) must sit ABOVE Client and Partner in Server Settings
  → Roles**, or `assignGuildRole()` fails outright — Discord's permission
  model won't let a bot grant a role at or above its own highest role.
- OAuth2 redirect registered: `https://nimiastudio.com/api/discord/callback`
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
- **Gamification phase (added 11 Agustus 2026): the 🌐 COMMUNITY and
  public 🤝 PARTNER PROGRAM channels above need to actually be created in
  Discord first** — this integration only ever posts into an EXISTING
  channel id (via the new `DISCORD_CHANNEL_*_ID` env vars, see
  `apps/studio/.env.example` / `apps/admin/.env.example`), it has no code
  path that creates a channel or category. Create the category + channels
  in Discord, copy each new channel's id the same way every existing
  `DISCORD_CHANNEL_*_ID` was obtained (see `packages/discord/README.md`),
  then fill in the env vars before the new notifications will actually
  post anywhere.
- **In-Discord ticket button (added 12 Agustus 2026), three manual steps,
  in this order:**
  1. Set `DISCORD_PUBLIC_KEY` and register the **Interactions Endpoint
     URL** (`https://nimiastudio.com/api/discord/interactions`) in
     the Developer Portal's General Information page — see
     `packages/discord/README.md` for exactly where. Discord PINGs the URL
     the moment you click Save; if `DISCORD_PUBLIC_KEY` isn't deployed and
     correct yet, Save fails right there with its own error.
  2. Deploy the app with that env var set (step 1's Save literally cannot
     succeed against a not-yet-deployed endpoint).
  3. Once both of the above are done, open `hub.nimiastudio.com/tickets`
     and click **Post Ticket Button** once — this posts the actual "Open a
     Ticket" message into `#create-ticket`. Nothing shows up in Discord
     until this manual click happens; registering the Interactions
     Endpoint URL alone only makes the endpoint reachable, it doesn't post
     anything.
- **In-Discord ticket button — same "Manage Threads" requirement as the
  website-originated tickets above applies here too**, no separate setup
  needed — both paths call the exact same `createPrivateThread()`.

## Implementation status (guild-join fix)

**Done (10 Agustus 2026):** fixed a gap found via production testing —
connecting Discord (account-linking, first pass above) only ever LINKED
the account in the database, it never actually added a not-yet-a-member
client INTO the Nimia Studio server. This made `assignGuildRole` and
`addThreadMember` (support tickets) silently no-op for any client who
connected Discord without already being a guild member (Discord returns
404 Unknown Member for both against a non-member — caught and logged, not
surfaced anywhere). See:

- `packages/discord/src/oauth.ts` — `OAUTH_SCOPE` widened from `"identify"` to `"identify guilds.join"`.
- `packages/discord/src/rest.ts` — new `addGuildMember()`, Discord's "Add Guild Member" endpoint (bot token + the user's own OAuth access token together).
- `apps/studio/app/api/discord/callback/route.ts` — calls `addGuildMember()` right after the account-link RPC succeeds, before the existing `assignGuildRole()` call.

**Manual follow-up required (can't be done from code):**

1. Confirm the bot has **Create Invite** (`CREATE_INSTANT_INVITE`) —
   `addGuildMember` needs it. See the updated bullet in "Server setup
   notes" above.
2. Any account that connected Discord BEFORE this fix (including test
   accounts used during earlier phases) needs to **Disconnect, then
   Connect again** on the Profile page — Discord doesn't retroactively
   widen an already-granted OAuth scope, so the code fix alone doesn't
   add already-linked-but-never-joined accounts to the server.

## Implementation status (support tickets)

**Done (9 Agustus 2026, fourth pass):** support tickets — "A 'Support'
button on the website → the bot creates a Private Ticket, visible only to
Founder + Admin + the Client who created it." See:

- `packages/db/migrations/0027_support_tickets.sql` — `support_tickets` table (denormalized client name/email snapshot, same convention as `orders`), `set_support_ticket_discord_thread_id()` RPC.
- `packages/discord/src/rest.ts` — `createPrivateThread()`, `addThreadMember()`, `archiveThread()`.
- `packages/discord/src/tickets.ts` (NEW) — `createSupportTicket()` (creates the private thread, posts the initial embed, adds the client if they've connected Discord) and `closeSupportTicketThread()` (archive + lock).
- `apps/studio/app/dashboard/support/` (NEW page + form + action) — reachable from the Topbar account dropdown (which used to link to a generic external Discord invite — replaced by this in-app flow, since "No general chat channel for support" was always the actual spec).
- `apps/admin/app/(protected)/tickets/` (NEW page + list + close action) — every open ticket, with a "Close Ticket" button and an "Open in Discord" deep link when a thread exists.

## Implementation status (in-Discord ticket button)

**Done (12 Agustus 2026):** the button itself — "In-Discord ticket button"
above. The first (and so far only) inbound half of this integration; every
other piece of `@nimia/discord` only ever calls OUT to Discord's REST API.
See:

- `packages/discord/src/interactions.ts` (NEW) — `verifyDiscordInteractionRequest()` (Ed25519 signature check against `DISCORD_PUBLIC_KEY`, using the `discord-interactions` package — Discord's own small helper for exactly this, not a Gateway SDK, see `packages/discord/README.md`'s "Kenapa tidak pakai discord.js"), `buildCreateTicketButtonMessage()` / `postCreateTicketButtonMessage()` (the button message itself), `buildTicketModal()` / `modalResponse()` / `readTicketModalValues()` (the Subject + Message modal), `deferredEphemeralResponse()` / `editInteractionResponse()` (ack-then-edit pattern for the 3-second response window).
- `packages/discord/src/rest.ts` — `sendChannelMessage()`'s payload widened with an optional `components` field (message buttons).
- `packages/discord/src/config.ts` — `getDiscordPublicKey()`, `getDiscordApplicationId()` (reuses `DISCORD_CLIENT_ID` — same value, no new secret).
- `packages/db/src/service.ts` (NEW) — `createServiceRoleClient()`, exported from `@nimia/db`. The interactions route has no signed-in website session to work with (Discord calls it directly), so it's the one caller in this codebase with a genuine reason to bypass RLS via the service-role key rather than go through `createServerClient` or a `SECURITY DEFINER` RPC — the route does its own authorization check by hand instead (does a `clients` row with this `discord_user_id` exist).
- `apps/studio/app/api/discord/interactions/route.ts` (NEW) — the actual Interactions HTTP endpoint. Verifies the request, responds to the button click with the modal, and on modal submit: looks up the client by `discord_user_id`, inserts the `support_tickets` row, calls the same `createSupportTicket()` the website's Support form already uses, and edits the deferred response with the result.
- `apps/admin/app/(protected)/tickets/actions.ts` (`postTicketButtonAction`, NEW) + `apps/admin/app/(protected)/tickets/PostTicketButtonCta.tsx` (NEW) — the one-time "post the button into #create-ticket" admin action, wired into the existing Tickets page.
- `apps/studio/.env.example` / `packages/discord/README.md` — `DISCORD_PUBLIC_KEY`, and the Developer Portal steps ("Server setup notes" above) for registering the Interactions Endpoint URL.

**Manual follow-up required (can't be done from code) — see the three
numbered steps under "Server setup notes" above:** set `DISCORD_PUBLIC_KEY`
+ register the Interactions Endpoint URL in the Developer Portal, deploy,
then click **Post Ticket Button** once on `hub.nimiastudio.com/tickets`.
None of this has been run yet — the button will not appear in
`#create-ticket` and clicking a not-yet-registered endpoint's button (if
one somehow existed) would fail until all three steps are done.
