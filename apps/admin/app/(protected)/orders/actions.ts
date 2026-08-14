"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import {
  sendNegotiationUpdateEmail,
  sendPaymentVerifiedEmail,
  sendPaymentFlaggedEmail,
} from "../../../lib/email";
import {
  notifyNegotiationUpdate,
  notifyPaymentVerified,
  notifyPaymentFlagged,
  notifyReferralReward,
  notifyPartnerLevelChanged,
  postOrUpdateLeaderboard,
  resolvePublicPartnerName,
  getDiscordChannelId,
  type LeaderboardRow,
} from "@nimia/discord";
import { resolvePartnerLevelDisplay, nextPartnerLevelDisplay } from "../partners/partner-level";

export type OrderActionResult = { success: true } | { success: false; error: string };

// Every write below relies on RLS as the real enforcement boundary
// (orders_update_admin_only / projects_admin_write in
// packages/db/migrations/0006_rls_policies.sql both gate on
// public.is_admin()) — this file is convenience/UX, not the security
// boundary itself.

// Shared shape for the client-facing fields every email below needs —
// requested via `.select()` on the same UPDATE that changes status, so
// sending the notification never costs a second round trip.
type OrderEmailFields = {
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  services: { name: string } | { name: string }[] | null;
  /** Added 9 Agustus 2026 (auto-thread pass) — not every select below asks
   * for this column (only the ones whose notify* call actually uses it),
   * so it's optional here rather than on every OrderEmailFields literal. */
  discord_thread_id?: string | null;
};

function resolveServiceName(services: OrderEmailFields["services"]): string {
  if (!services) return "your project";
  const row = Array.isArray(services) ? services[0] : services;
  return row?.name ?? "your project";
}

function resolveClientName(order: OrderEmailFields): string {
  return order.full_name ?? order.company_name ?? "there";
}

// Client dashboard now lives on apps/app, not apps/studio (14 Agustus
// 2026, dashboard split — see project memory's studio_multi_app_split_plan).
// NEXT_PUBLIC_APP_URL replaces the old NEXT_PUBLIC_STUDIO_URL-based
// construction here — NEXT_PUBLIC_STUDIO_URL (see Topbar.tsx) still points
// at the marketing site, which no longer has a /dashboard.
const CLIENT_DASHBOARD_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com"}/dashboard/orders`;

export async function approveOrderAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("orders")
    .update({ status: "quotation_sent" })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

export async function rejectOrderAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("orders").update({ status: "rejected" }).eq("id", orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Creates the public.projects row an approved order becomes, then marks the
// order 'converted' — the same two-step "order -> project" hand-off
// docs/ARCHITECTURE.md describes admin doing manually once ready to start
// work. project_updates gets its first row automatically via the
// log_project_status_change trigger (0003_orders_projects.sql) on insert.
export async function convertToProjectAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, client_id, description, status, services(name)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "quotation_sent") {
    return {
      success: false,
      error: "Only orders in Quotation Sent can be converted to a project.",
    };
  }

  const serviceName = (order as any).services?.name as string | undefined;
  const description = (order as any).description as string;
  const title = serviceName
    ? `${serviceName}: ${description.slice(0, 40)}`
    : description.slice(0, 60);

  const { error: insertError } = await supabase.from("projects").insert({
    order_id: order.id,
    client_id: (order as any).client_id,
    title,
  });
  if (insertError) return { success: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "converted" })
    .eq("id", orderId);
  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true };
}

// ------------------------------------------------------------------
// Direct (non-negotiated) order -> payment bridge (5 Agustus 2026, bug fix
// — "kok di akun klien pas mau submit pembayaran ga muncul"). A client who
// uses /order's plain "Submit Order" button (not "Negotiate Price") gets
// an order that goes pending_review -> quotation_sent (via
// approveOrderAction above) — and until this action existed, there was NO
// way for that order to ever reach 'awaiting_payment': the only
// transition into that status was acceptNegotiationOfferAction below,
// which only ever fires from 'negotiating'. A quotation_sent order's only
// options were "Convert to Project" (skips payment entirely — kept as-is
// for orders handled outside the crypto-payment system) or "Reject". This
// is the missing bridge: same idea as acceptNegotiationOfferAction, just
// setting a price directly instead of accepting an existing
// order_negotiations row, since a non-negotiated order has none to accept.
//
// Reuses NegotiationUpdateEmail's "accepted" copy rather than a new
// template — the client-facing message ("your price is set, ready to
// pay") is exactly right here too, even though this order was never
// literally negotiated; `proposed_price_usd` (always set by
// submitOrderAction's price calculator, negotiated or not — see
// apps/studio/modules/order/state/submit-order-action.ts) is close enough
// to "an offer" that the copy still reads true.
// ------------------------------------------------------------------

export async function sendQuotationForPaymentAction(
  orderId: string,
  amountUsd: number,
): Promise<OrderActionResult> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { success: false, error: "Enter a valid price." };
  }

  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "quotation_sent") {
    return { success: false, error: "Only orders with a sent quotation can be moved to payment." };
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "awaiting_payment", final_price_usd: amountUsd })
    .eq("id", orderId)
    .select("email, full_name, company_name, services(name), discord_thread_id")
    .single();

  if (error) return { success: false, error: error.message };

  const fields = updated as unknown as OrderEmailFields | null;
  if (fields?.email) {
    await sendNegotiationUpdateEmail(fields.email, {
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      kind: "accepted",
      amountUsd,
      dashboardUrl: CLIENT_DASHBOARD_URL,
    });
  }
  // Added 9 Agustus 2026 (notifications phase) — same "reuses accepted
  // copy" reasoning as the email right above, see this action's own file
  // comment for why a direct-quote order is treated as an accepted
  // negotiation for notification purposes too.
  if (fields) {
    await notifyNegotiationUpdate({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      kind: "accepted",
      amountUsd,
      threadId: fields.discord_thread_id,
    });
  }

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// ------------------------------------------------------------------
// Negotiation actions (3 Agustus 2026, per user request — "kok gaada list
// yang nego sih"). An order lands in status 'negotiating' when a client
// uses /order's "Negotiate Price" button (see
// apps/studio/modules/order/state/submit-order-action.ts); until now this
// app had no way to see the offer or respond to it. Mirrors the
// client-facing thread in
// apps/studio/app/dashboard/negotiations/NegotiationThreadList.tsx — same
// order_negotiations rows, opposite side of the conversation.
// ------------------------------------------------------------------

// Accepts an offer as-is: records it as the agreed price and moves the
// order to 'awaiting_payment' (the next stage in the crypto-payment flow,
// see packages/db/migrations/0012/0013) so the client can be sent a wallet
// address to pay. Deliberately does NOT insert a new order_negotiations
// row — accepting isn't a new offer, it's agreeing to the existing one.
//
// 4 Agustus 2026 (P0.2): also emails the client — this is the moment they
// go from "waiting on a reply" to "actually able to pay", and until now
// nothing told them that happened outside of them reopening the dashboard.
//
// 5 Agustus 2026 (audit follow-up): added a status guard before the
// UPDATE — every OTHER action in this file that transitions `orders`
// re-checks the current status first (see sendCounterOfferAction,
// verifyPaymentAction, flagUnderpaidPaymentAction below), and so does this
// action's client-side RPC equivalent (accept_negotiation_offer, 0019).
// This one was the odd one out: with RLS (orders_update_admin_only) not
// itself constrained by status, a stale admin modal — say the client's
// payment got verified in another tab while this modal was still open —
// could otherwise silently knock an already-`paid`/`converted` order back
// to `awaiting_payment` at a stale offer amount.
export async function acceptNegotiationOfferAction(
  orderId: string,
  amountUsd: number,
): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (existingError || !existing) {
    return { success: false, error: existingError?.message ?? "Order not found." };
  }
  if ((existing as any).status !== "negotiating") {
    return { success: false, error: "This order is no longer under negotiation." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "awaiting_payment", final_price_usd: amountUsd })
    .eq("id", orderId)
    .select("email, full_name, company_name, services(name), discord_thread_id")
    .single();

  if (error) return { success: false, error: error.message };

  const fields = order as unknown as OrderEmailFields | null;
  if (fields?.email) {
    await sendNegotiationUpdateEmail(fields.email, {
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      kind: "accepted",
      amountUsd,
      dashboardUrl: CLIENT_DASHBOARD_URL,
    });
  }
  // Added 9 Agustus 2026 (notifications phase).
  if (fields) {
    await notifyNegotiationUpdate({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      kind: "accepted",
      amountUsd,
      threadId: fields.discord_thread_id,
    });
  }

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Sends a counter offer: a new order_negotiations row from 'staff' — same
// shape as the client's own offer, just the other side of the thread. The
// order stays in 'negotiating' until either side accepts (or rejects).
//
// 4 Agustus 2026 (P0.2): also emails the client so they know a counter
// offer is waiting on them instead of finding out only if they happen to
// check the dashboard.
export async function sendCounterOfferAction(
  orderId: string,
  amountUsd: number,
  message?: string,
): Promise<OrderActionResult> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { success: false, error: "Enter a valid counter offer amount." };
  }

  const supabase = createServerClient(await cookies());

  // Defense in depth alongside order_negotiations_insert_own_or_admin's RLS
  // check — this also makes sure the order is actually still negotiating
  // rather than silently attaching an offer to an already-closed order.
  // Also doubles as the fetch for the client-facing fields the email needs.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, email, full_name, company_name, services(name), discord_thread_id")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "negotiating") {
    return { success: false, error: "This order is no longer under negotiation." };
  }

  const { error } = await supabase.from("order_negotiations").insert({
    order_id: orderId,
    proposed_by: "staff",
    amount_usd: amountUsd,
    message: message?.trim() || null,
  });

  if (error) return { success: false, error: error.message };

  const fields = order as unknown as OrderEmailFields;
  if (fields.email) {
    await sendNegotiationUpdateEmail(fields.email, {
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      kind: "counter",
      amountUsd,
      message: message?.trim() || null,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com"}/dashboard/negotiations`,
    });
  }
  // Added 9 Agustus 2026 (notifications phase).
  await notifyNegotiationUpdate({
    orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
    clientName: resolveClientName(fields),
    serviceName: resolveServiceName(fields.services),
    kind: "offer",
    proposedBy: "staff",
    amountUsd,
    message: message?.trim() || null,
    threadId: fields.discord_thread_id,
  });

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Ends a negotiation without agreeing to a price — same terminal state as
// rejecting a fresh order, just reachable from 'negotiating' too. No email
// here yet (deliberately — see NegotiationUpdateEmail.tsx's file comment):
// this shares rejectOrderAction with plain, non-negotiated order rejection,
// which has no agreed/offered price to show and would need its own copy.
//
// 9 Agustus 2026 (notifications phase): DOES send a Discord notification
// though (unlike the email) — #negotiations should show a rejection
// happened even without a full client-facing email template for it, so
// this fetches just enough (name/service) to post one before delegating
// the actual status change to rejectOrderAction.
export async function rejectNegotiationAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { data: order } = await supabase
    .from("orders")
    .select("full_name, company_name, services(name), discord_thread_id")
    .eq("id", orderId)
    .single();

  const result = await rejectOrderAction(orderId);

  if (result.success && order) {
    const fields = order as unknown as OrderEmailFields;
    await notifyNegotiationUpdate({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      kind: "rejected",
      amountUsd: null,
      threadId: fields.discord_thread_id,
    });
  }

  return result;
}

// ------------------------------------------------------------------
// Payment verification actions (3 Agustus 2026, second pass, per user
// request — "kenapa belum bisa bayar/kirim pembayaran"). Once a client
// submits a tx hash via apps/studio's PaymentPanel (see
// apps/studio/app/dashboard/orders/payment-actions.ts), the order sits at
// 'payment_submitted' with payment_network/token/wallet_address/
// expected_amount/tx_hash filled in (packages/db/migrations/0013) — until
// now nothing here ever read those columns or moved the order past that
// point.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Discord Partner Program gamification (11 Agustus 2026) — everything
// below this comment supports verifyPaymentAction's PAYMENT CONFIRMED
// transition, which is the ONLY place in this whole app a
// partner_rewards row gets created (handle_order_paid_partner_reward(),
// migration 0016, an AFTER UPDATE trigger on orders.status). Per the
// original Discord brief (sections 6/7/25/29): registration, order
// creation, and a submitted-but-unverified payment must NEVER trigger a
// reward or a public Discord post — this code only ever runs from inside
// verifyPaymentAction, so that's structurally guaranteed, not just a
// naming convention.
// ------------------------------------------------------------------

type PartnerDiscordSnapshot = {
  partnerId: string;
  fullName: string | null;
  isFoundingPartner: boolean;
  joinedViaPartnerPage: boolean;
  discordUserId: string | null;
  beforePaidClientsCount: number;
};

/** Looks up whether `clientId` was referred by a Partner, and if so
 * snapshots that partner's paid-clients count and display info BEFORE the
 * orders UPDATE below runs. This has to happen BEFORE, not after: the
 * reward trigger recomputes partner_paid_clients_count() inside the SAME
 * UPDATE statement (an AFTER UPDATE trigger, same transaction) — by the
 * time verifyPaymentAction's own `.update()` call returns, the "before"
 * count is already gone, there's no way to recover it after the fact.
 * Best-effort and never throws: any failure here just means the
 * Discord-side reward/level-up/leaderboard notifications get silently
 * skipped for this one payment — it must never block payment verification
 * itself, which has already fully succeeded by the time this is called. */
async function getReferringPartnerSnapshot(
  supabase: ReturnType<typeof createServerClient>,
  clientId: string | null,
): Promise<PartnerDiscordSnapshot | null> {
  if (!clientId) return null;
  try {
    const { data: partnerId, error: partnerIdError } = await supabase.rpc("get_referring_partner_id", {
      p_client_id: clientId,
    });
    if (partnerIdError || !partnerId) return null;

    const [{ data: profileRows }, { data: metricsRows }] = await Promise.all([
      supabase.rpc("get_partner_discord_profile", { p_partner_id: partnerId }),
      supabase.rpc("get_partner_metrics", { p_partner_id: partnerId }),
    ]);
    const profile = profileRows?.[0];
    const metrics = metricsRows?.[0];
    if (!profile || !metrics) return null;

    return {
      partnerId: partnerId as string,
      fullName: profile.full_name,
      isFoundingPartner: profile.is_founding_partner,
      joinedViaPartnerPage: profile.joined_via_partner_page,
      discordUserId: profile.discord_user_id,
      beforePaidClientsCount: Number(metrics.paid_clients_count),
    };
  } catch (error) {
    console.error("[discord] Failed to snapshot the referring partner before payment confirmation", error);
    return null;
  }
}

/** Recomputes the top-10 public leaderboard (get_partner_leaderboard_public,
 * migration 0035 — SUCCESSFUL PAID REFERRALS only, per brief section 13)
 * and edits the one pinned message in #partner-leaderboard rather than
 * posting a new one (brief section 24). Persists whatever message id
 * postOrUpdateLeaderboard returns back to discord_leaderboard_state so the
 * NEXT call knows which message to edit. Best-effort, never throws. */
async function refreshPartnerLeaderboard(supabase: ReturnType<typeof createServerClient>): Promise<void> {
  try {
    const [{ data: rows, error: rowsError }, { data: state }] = await Promise.all([
      supabase.rpc("get_partner_leaderboard_public", { p_limit: 10 }),
      supabase.from("discord_leaderboard_state").select("message_id").eq("id", true).maybeSingle(),
    ]);

    // If the leaderboard query itself failed (RLS/permission issue, RPC
    // not deployed yet, etc.), bail out rather than editing the pinned
    // message down to an empty "no referrals yet" state — an outdated
    // leaderboard is much less harmful than a WRONG one that contradicts
    // what #recent-rewards is showing right above it.
    if (rowsError) {
      console.error("[discord] get_partner_leaderboard_public failed, leaving the leaderboard message as-is", rowsError);
      return;
    }

    const leaderboardRows: LeaderboardRow[] = (rows ?? []).map((row: any) => {
      const level = resolvePartnerLevelDisplay(
        Number(row.paid_clients_count),
        row.is_founding_partner,
        row.joined_via_partner_page,
      );
      return {
        displayName: resolvePublicPartnerName({
          discordUserId: row.discord_user_id,
          fullName: row.full_name,
        }),
        paidClientsCount: Number(row.paid_clients_count),
        levelLabel: level.label,
        levelEmoji: level.emoji,
      };
    });

    const existingMessageId = (state as { message_id: string | null } | null)?.message_id ?? null;
    const channelId = getDiscordChannelId("partner-leaderboard");
    const { messageId } = await postOrUpdateLeaderboard(channelId, existingMessageId, leaderboardRows);

    if (messageId && messageId !== existingMessageId) {
      const { error: upsertError } = await supabase
        .from("discord_leaderboard_state")
        .upsert({ id: true, message_id: messageId, updated_at: new Date().toISOString() });
      if (upsertError) {
        console.error("[discord] Failed to persist the new leaderboard message id", upsertError);
      }
    }
  } catch (error) {
    console.error("[discord] Failed to refresh the partner leaderboard", error);
  }
}

/** REFERRAL_REWARD_CREATED + PARTNER_LEVEL_CHANGED, both derived from
 * comparing `snapshot.beforePaidClientsCount` (captured before the payment
 * UPDATE by getReferringPartnerSnapshot above) against the partner's
 * CURRENT count (re-read here, after the UPDATE has committed and the
 * reward trigger has already run). If the count didn't move, no reward was
 * actually created for this order (e.g. this referred client had already
 * been counted from an earlier paid order) — nothing to announce, and the
 * leaderboard doesn't need a refresh either. Best-effort, never throws —
 * called after verifyPaymentAction's own response-critical work is done. */
async function handlePartnerDiscordEvents(
  supabase: ReturnType<typeof createServerClient>,
  snapshot: PartnerDiscordSnapshot,
): Promise<void> {
  try {
    const { data: metricsRows } = await supabase.rpc("get_partner_metrics", {
      p_partner_id: snapshot.partnerId,
    });
    const afterPaidClientsCount = Number(metricsRows?.[0]?.paid_clients_count ?? snapshot.beforePaidClientsCount);
    if (afterPaidClientsCount <= snapshot.beforePaidClientsCount) return;

    const beforeLevel = resolvePartnerLevelDisplay(
      snapshot.beforePaidClientsCount,
      snapshot.isFoundingPartner,
      snapshot.joinedViaPartnerPage,
    );
    const afterLevel = resolvePartnerLevelDisplay(
      afterPaidClientsCount,
      snapshot.isFoundingPartner,
      snapshot.joinedViaPartnerPage,
    );

    await notifyReferralReward({
      fullName: snapshot.fullName ?? "A Nimia Partner",
      discordUserId: snapshot.discordUserId,
      paidClientsCount: afterPaidClientsCount,
      levelLabel: afterLevel.label,
      levelEmoji: afterLevel.emoji,
    });

    if (afterLevel.label !== beforeLevel.label) {
      const next = nextPartnerLevelDisplay(afterLevel);
      await notifyPartnerLevelChanged({
        fullName: snapshot.fullName ?? "A Nimia Partner",
        discordUserId: snapshot.discordUserId,
        newLevelLabel: afterLevel.label,
        newLevelEmoji: afterLevel.emoji,
        paidClientsCount: afterPaidClientsCount,
        nextLevelLabel: next?.label ?? null,
        paidClientsToNext: next?.minPaidClients ?? null,
      });
    }

    await refreshPartnerLeaderboard(supabase);
  } catch (error) {
    console.error("[discord] Failed to send partner reward/level-up notification", error);
  }
}

// Confirms the submitted tx actually matches (checked manually against a
// block explorer — this app has no on-chain verification of its own) and
// marks the order 'paid'. payment_verified_by/payment_verified_at (0013)
// record who/when, same idea as payment_verified_by on the legacy
// IDR-invoice flow's `payments` table (0005).
//
// 4 Agustus 2026 (P0.2): also emails the client — this is the one moment
// in the whole flow where "did my payment go through?" finally gets a
// definitive yes, and previously they'd only find out by refreshing the
// dashboard.
export async function verifyPaymentAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, client_id")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "payment_submitted") {
    return { success: false, error: "Only orders with a submitted payment can be verified." };
  }

  // Added 11 Agustus 2026 (Discord gamification phase) — see
  // getReferringPartnerSnapshot's own comment for why this MUST happen
  // before the UPDATE below, not after.
  const partnerSnapshot = await getReferringPartnerSnapshot(supabase, (order as any).client_id ?? null);

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_verified_by: user.id,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("email, full_name, company_name, final_price_usd, payment_network, payment_token, services(name), discord_thread_id")
    .single();

  if (error) return { success: false, error: error.message };

  const fields = updated as unknown as
    | (OrderEmailFields & {
        final_price_usd: number | null;
        payment_network: string | null;
        payment_token: string | null;
      })
    | null;
  if (fields?.email && fields.final_price_usd != null && fields.payment_network && fields.payment_token) {
    await sendPaymentVerifiedEmail(fields.email, {
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      amountUsd: fields.final_price_usd,
      network: fields.payment_network,
      currency: fields.payment_token,
      dashboardUrl: CLIENT_DASHBOARD_URL,
    });
  }
  // Added 9 Agustus 2026 (notifications phase).
  if (fields && fields.final_price_usd != null && fields.payment_network && fields.payment_token) {
    await notifyPaymentVerified({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      amountUsd: fields.final_price_usd,
      network: fields.payment_network,
      currency: fields.payment_token,
      threadId: fields.discord_thread_id,
    });
  }

  // Added 11 Agustus 2026 (Discord gamification phase) — REFERRAL_REWARD_CREATED
  // / PARTNER_LEVEL_CHANGED / leaderboard refresh, all keyed off this exact
  // PAYMENT CONFIRMED transition. Only runs when a referring partner was
  // actually found before the update AND this order has a final price (the
  // same two conditions handle_order_paid_partner_reward(), 0016, itself
  // requires to create a reward row) — see handlePartnerDiscordEvents's own
  // comment for the rest.
  if (partnerSnapshot && fields?.final_price_usd != null) {
    await handlePartnerDiscordEvents(supabase, partnerSnapshot);
  }

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// The submitted tx didn't check out (wrong amount, wrong network, not
// found, etc.) — sent back to 'awaiting_payment' (rather than left on
// 'payment_submitted') because orders_update_own_payment_submission (0013)
// only lets the client move FROM 'awaiting_payment', so that's the only
// status PaymentPanel's network/currency picker renders for. The note is
// shown to the client on their next visit (see PaymentPanel.tsx's
// `underpaidNote` banner) so they know what to fix before resending.
//
// 4 Agustus 2026 (P0.2): also emails the client with the note itself,
// instead of relying on them to notice the banner next time they happen
// to open the dashboard.
//
// 5 Agustus 2026 (audit follow-up): also nulls out the stale
// payment_network/token/wallet_address/expected_amount/tx_hash/
// submitted_at columns from the rejected submission — previously these
// were left in place until the client's NEXT successful submit
// (submit_payment_transaction, 0020, is what actually overwrites them),
// which meant this admin panel's Payment section (gated on
// `payment_submitted_at` being non-null, see OrderDetailPanel.tsx) kept
// showing the old rejected amount/tx hash as if it were still current
// while staff waited for a resubmission. Purely a display fix — no money
// was ever at risk, submit_payment_transaction always re-derives these
// fresh regardless of what was here before.
export async function flagUnderpaidPaymentAction(
  orderId: string,
  note: string,
): Promise<OrderActionResult> {
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    return { success: false, error: "Explain what's wrong with the payment for the client to see." };
  }

  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "payment_submitted") {
    return { success: false, error: "Only orders with a submitted payment can be flagged." };
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      status: "awaiting_payment",
      payment_underpaid_note: trimmedNote,
      payment_network: null,
      payment_token: null,
      payment_wallet_address: null,
      payment_expected_amount: null,
      payment_tx_hash: null,
      payment_submitted_at: null,
    })
    .eq("id", orderId)
    .select("email, full_name, company_name, services(name), discord_thread_id")
    .single();

  if (error) return { success: false, error: error.message };

  const fields = updated as unknown as OrderEmailFields | null;
  if (fields?.email) {
    await sendPaymentFlaggedEmail(fields.email, {
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      note: trimmedNote,
      dashboardUrl: CLIENT_DASHBOARD_URL,
    });
  }
  // Added 9 Agustus 2026 (notifications phase).
  if (fields) {
    await notifyPaymentFlagged({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      note: trimmedNote,
      threadId: fields.discord_thread_id,
    });
  }

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}
