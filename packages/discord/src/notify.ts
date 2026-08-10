import { sendChannelMessage, createThreadFromMessage, type DiscordEmbed } from "./rest";
import { getDiscordChannelId } from "./config";

// Notifications phase (9 Agustus 2026) — see docs/DISCORD.md's "Bot
// responsibilities" and "Order/Payment/Negotiation flow" sections for the
// spec this implements. Every export below is deliberately NEVER-THROWING:
// by the time any caller reaches one of these, the real work (order saved,
// payment recorded, negotiation offer inserted, etc.) already succeeded —
// Discord being down, misconfigured, or rate-limited must never roll that
// back or surface as an error to the client/admin using the site. This is
// the same fire-and-log posture @nimia/email's send*Email helpers already
// use (see apps/studio's lib/email.tsx / apps/admin's lib/email.tsx file
// comments) — callers can just `await notifyXxx(...)` with no try/catch of
// their own.
//
// Auto-thread pass (9 Agustus 2026, second pass) — docs/DISCORD.md's
// "Order thread system": every order gets its own Discord Thread the
// moment notifyNewOrder below creates it (hanging off the #new-orders
// notification message — see createThreadFromMessage's comment in
// rest.ts). Callers are responsible for PERSISTING the returned thread id
// (on `orders.discord_thread_id`, migration 0026) and passing it back in
// on every later notify* call for that order via the optional `threadId`
// param — this package has zero dependencies by design (see README.md's
// "kenapa tidak pakai discord.js" — same reasoning applies to not adding
// @nimia/db here), so it can never look the thread id up itself.

const COLOR_NEW = 0x5865f2; // Discord blurple — "something new happened"
const COLOR_OFFER = 0xf5a623; // amber — "waiting on a decision"
const COLOR_ACCEPTED = 0x2ecc71; // green — agreed / verified
const COLOR_REJECTED = 0xe74c3c; // red — rejected / flagged
const COLOR_PAYMENT_SUBMITTED = 0x3498db; // blue — informational, not yet actioned
const COLOR_SYSTEM = 0x99aaab; // neutral grey — plain activity log

type DiscordChannelName = Parameters<typeof getDiscordChannelId>[0];

/** Every notify* function below funnels through this for its main
 * (non-thread) send — resolves the target channel's env var, sends the
 * embed, and swallows (logs) any failure rather than throwing. A
 * missing/misconfigured channel env var is exactly as recoverable as a
 * Discord API error from here: neither should be able to break the
 * website action that triggered the notification. */
async function safeSend(channel: DiscordChannelName, embed: DiscordEmbed, context: string): Promise<void> {
  try {
    const channelId = getDiscordChannelId(channel);
    await sendChannelMessage(channelId, { embeds: [embed] });
  } catch (error) {
    console.error(`[discord] Failed to send ${context} notification`, error);
  }
}

/** Posts a short plain-text update into an order's thread, if it has one.
 * A no-op (not even an attempt) when `threadId` is null/undefined — most
 * commonly because the order predates migration 0026, or notifyNewOrder's
 * thread creation itself failed for that order. Separate try/catch from
 * safeSend above: an order's thread being unreachable (e.g. deleted
 * manually in Discord) must never block the operational channel
 * notification staff actually need. */
async function postToThread(threadId: string | null | undefined, content: string, context: string): Promise<void> {
  if (!threadId) return;
  try {
    await sendChannelMessage(threadId, { content });
  } catch (error) {
    console.error(`[discord] Failed to post to order thread for ${context}`, error);
  }
}

/** Mirrors a short summary of an operational notification to #system-log.
 * docs/DISCORD.md lists "Order Created / Negotiation Updated / Payment
 * Submitted / Payment Approved" as system-log events — exactly the events
 * every notify* function below already has full context for, so this is a
 * second safeSend rather than a new hook somewhere else. A separate call
 * (not a fan-out inside safeSend itself) so a bad
 * DISCORD_CHANNEL_SYSTEM_LOG_ID can never block the operational
 * notification staff actually need to act on. */
async function logToSystemChannel(summary: string, context: string): Promise<void> {
  await safeSend(
    "system-log",
    { description: summary, color: COLOR_SYSTEM, timestamp: new Date().toISOString() },
    context,
  );
}

function formatUsd(amountUsd: number): string {
  return `$${amountUsd.toFixed(2)}`;
}

// ------------------------------------------------------------------
// #new-orders
// ------------------------------------------------------------------

/** Fired once from submitOrderAction (apps/studio) right after a new
 * `orders` row (and, for "Negotiate Price" submissions, its first
 * order_negotiations row) is created — see docs/DISCORD.md's Order flow:
 * "website creates the Order → Discord notification to #new-orders →
 * bot creates a Thread". Returns the new thread's id so the caller can
 * save it to `orders.discord_thread_id` (migration 0026) — `null` if
 * either step failed (missing/bad env vars, Discord API error, etc.),
 * which callers should treat exactly like "this order has no thread yet"
 * rather than retrying inline; never throws either way. */
export async function notifyNewOrder(params: {
  orderId: string;
  clientName: string;
  serviceName: string;
  amountUsd: number | null;
  isNegotiation: boolean;
}): Promise<{ threadId: string | null }> {
  let threadId: string | null = null;
  try {
    const channelId = getDiscordChannelId("new-orders");
    const messageId = await sendChannelMessage(channelId, {
      embeds: [
        {
          title: `📦 New Order — ${params.orderId}`,
          description: params.isNegotiation
            ? `${params.clientName} submitted a new order for **${params.serviceName}** and opened a price negotiation.`
            : `${params.clientName} submitted a new order for **${params.serviceName}**.`,
          color: COLOR_NEW,
          fields: [
            { name: "Client", value: params.clientName, inline: true },
            { name: "Service", value: params.serviceName, inline: true },
            ...(params.amountUsd != null
              ? [
                  {
                    name: params.isNegotiation ? "Client's Offer" : "Estimated Price",
                    value: formatUsd(params.amountUsd),
                    inline: true,
                  },
                ]
              : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
    threadId = await createThreadFromMessage(channelId, messageId, `📦 ${params.orderId}`);
  } catch (error) {
    console.error("[discord] Failed to send new order notification / create its thread", error);
  }

  await logToSystemChannel(
    `📦 Order Created — ${params.orderId} (${params.clientName}, ${params.serviceName})`,
    "system-log (order created)",
  );

  return { threadId };
}

// ------------------------------------------------------------------
// #negotiations
// ------------------------------------------------------------------

export type NegotiationEventKind = "offer" | "accepted" | "rejected";

const NEGOTIATION_COPY: Record<NegotiationEventKind, { title: string; color: number }> = {
  offer: { title: "💬 Negotiation Offer", color: COLOR_OFFER },
  accepted: { title: "✅ Negotiation Accepted", color: COLOR_ACCEPTED },
  rejected: { title: "❌ Negotiation Rejected", color: COLOR_REJECTED },
};

/** Covers every step of docs/DISCORD.md's negotiation thread: a fresh
 * counter offer from either side (`kind: "offer"`, `proposedBy` says
 * which), the offer being accepted (either explicitly, or implicitly via
 * apps/admin's sendQuotationForPaymentAction setting a price directly —
 * see that action's own comment on why it reuses "accepted" copy), or the
 * negotiation being closed without agreement (`kind: "rejected"`).
 * Negotiation happens entirely on the website (docs/DISCORD.md: "Discord
 * is notification-only") — this never lets Discord-side state feed back
 * into a decision. Pass `threadId` (from `orders.discord_thread_id`) to
 * also mirror a short line into the order's own thread — omit/null if the
 * order has none (see notifyNewOrder's own comment on why that happens). */
export async function notifyNegotiationUpdate(params: {
  orderId: string;
  clientName: string;
  serviceName: string;
  kind: NegotiationEventKind;
  proposedBy?: "client" | "staff";
  amountUsd: number | null;
  message?: string | null;
  threadId?: string | null;
}): Promise<void> {
  const { title, color } = NEGOTIATION_COPY[params.kind];
  const who = params.proposedBy === "client" ? "Client" : params.proposedBy === "staff" ? "Nimia Studio" : null;

  await safeSend(
    "negotiations",
    {
      title: `${title} — ${params.orderId}`,
      description: `${params.clientName} · ${params.serviceName}${who ? ` · offer from ${who}` : ""}`,
      color,
      fields: [
        ...(params.amountUsd != null
          ? [{ name: "Amount", value: formatUsd(params.amountUsd), inline: true }]
          : []),
        ...(params.message ? [{ name: "Message", value: params.message }] : []),
      ],
      timestamp: new Date().toISOString(),
    },
    "negotiation update",
  );
  await logToSystemChannel(
    `💬 Negotiation Updated — ${params.orderId} (${params.kind}${params.amountUsd != null ? `, ${formatUsd(params.amountUsd)}` : ""})`,
    "system-log (negotiation updated)",
  );
  await postToThread(
    params.threadId,
    `${title}${who ? ` (from ${who})` : ""}${params.amountUsd != null ? ` — ${formatUsd(params.amountUsd)}` : ""}`,
    "negotiation update",
  );
}

// ------------------------------------------------------------------
// #payment-verification
// ------------------------------------------------------------------

/** Client sent a payment + TX hash (submitPaymentAction, apps/studio) —
 * per docs/DISCORD.md's Payment flow, this is purely informational: it
 * tells Admin something is waiting, the actual verification decision still
 * only ever happens on the Dashboard. */
export async function notifyPaymentSubmitted(params: {
  orderId: string;
  clientName: string;
  network: string;
  currency: string;
  txHash: string;
  threadId?: string | null;
}): Promise<void> {
  await safeSend(
    "payment-verification",
    {
      title: `🪙 Payment Submitted — ${params.orderId}`,
      description: `${params.clientName} submitted a payment for review.`,
      color: COLOR_PAYMENT_SUBMITTED,
      fields: [
        { name: "Network", value: params.network, inline: true },
        { name: "Currency", value: params.currency, inline: true },
        { name: "TX Hash", value: `\`${params.txHash}\`` },
      ],
      timestamp: new Date().toISOString(),
    },
    "payment submitted",
  );
  await logToSystemChannel(
    `🪙 Payment Submitted — ${params.orderId} (${params.clientName}, ${params.network}/${params.currency})`,
    "system-log (payment submitted)",
  );
  await postToThread(params.threadId, `🪙 Payment Submitted — ${params.network}/${params.currency}`, "payment submitted");
}

/** Admin confirmed the submitted TX matches (verifyPaymentAction,
 * apps/admin) — the "payment verified" update docs/DISCORD.md says Discord
 * only ever receives after the fact. */
export async function notifyPaymentVerified(params: {
  orderId: string;
  clientName: string;
  amountUsd: number;
  network: string;
  currency: string;
  threadId?: string | null;
}): Promise<void> {
  await safeSend(
    "payment-verification",
    {
      title: `✅ Payment Verified — ${params.orderId}`,
      description: `${params.clientName}'s payment was verified by an admin.`,
      color: COLOR_ACCEPTED,
      fields: [
        { name: "Amount", value: formatUsd(params.amountUsd), inline: true },
        { name: "Network", value: params.network, inline: true },
        { name: "Currency", value: params.currency, inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
    "payment verified",
  );
  await logToSystemChannel(
    `✅ Payment Approved — ${params.orderId} (${params.clientName}, ${formatUsd(params.amountUsd)})`,
    "system-log (payment approved)",
  );
  await postToThread(params.threadId, `✅ Payment Verified — ${formatUsd(params.amountUsd)}`, "payment verified");
}

/** The submitted TX didn't check out (flagUnderpaidPaymentAction,
 * apps/admin) — sent back to the client to resubmit. */
export async function notifyPaymentFlagged(params: {
  orderId: string;
  clientName: string;
  note: string;
  threadId?: string | null;
}): Promise<void> {
  await safeSend(
    "payment-verification",
    {
      title: `⚠️ Payment Flagged — ${params.orderId}`,
      description: `${params.clientName}'s submitted payment did not check out.`,
      color: COLOR_REJECTED,
      fields: [{ name: "Reason", value: params.note }],
      timestamp: new Date().toISOString(),
    },
    "payment flagged",
  );
  await logToSystemChannel(`⚠️ Payment Flagged — ${params.orderId} (${params.clientName})`, "system-log (payment flagged)");
  await postToThread(params.threadId, `⚠️ Payment Flagged — ${params.note}`, "payment flagged");
}

// ------------------------------------------------------------------
// #system-log
// ------------------------------------------------------------------

/** Escape hatch for one-off system-log entries that don't fit any of the
 * typed notify* functions above (every operational event above already
 * mirrors itself here automatically — this is for anything else). Not
 * currently called anywhere; exported for the next phase of
 * docs/DISCORD.md's system-log list (User Registered, Partner Registered,
 * Invoice Generated, Delivery Uploaded, Voucher Claimed, Referral
 * Commission — see that file's "Implementation status" section). */
export async function notifySystemLog(event: string, description: string): Promise<void> {
  await safeSend(
    "system-log",
    { title: event, description, color: COLOR_SYSTEM, timestamp: new Date().toISOString() },
    `system-log (${event})`,
  );
}
