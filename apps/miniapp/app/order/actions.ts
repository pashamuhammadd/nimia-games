"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { notifyNewOrder } from "@nimia/discord";
import { estimatePriceUsd, isValidDuration } from "./pricing";

export type CreateOrderResult = { success: true; orderId: string } | { success: false; error: string };

export interface CreateOrderFields {
  offeringKey: string;
  offeringLabel: string;
  durationSec: string;
  /** The client's own opening price, if they chose to propose one instead
   * of waiting for a staff quote - null when they left "Your offer"
   * blank in NewOrderForm.tsx. */
  clientOfferUsd: number | null;
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  deadline: string;
  description: string;
  referenceLink: string;
}

/** In-Mini-App order creation (new, 20 Agustus 2026, per Pasha's "harus
 * bisa membuat order ... di miniapp" request). Deliberately NOT a second
 * copy of apps/app's OrderWizard (apps/app/modules/order - a large
 * multi-category configurator with live pricing, bundles, and
 * installment plans): this is a short-form intake for exactly the two
 * curated offerings app/services/page.tsx promotes (Meme Animation,
 * Crypto GIFs). `service_id` is left null since neither offering exists
 * as a `public.services` row - the offering type and duration are
 * folded into `description` instead so staff still see them at a
 * glance.
 *
 * Follow-up, same day, per Pasha's "alur negosiasinya harus sama [seperti
 * di website]" request: this now mirrors
 * apps/app/modules/order/state/submit-order-action.ts's two intents
 * exactly, not just its single "submit and wait" path —
 *   - No client offer -> `status: "pending_review"`, same as that
 *     action's default intent. Staff quotes first.
 *   - A client offer -> `status: "negotiating"` PLUS an immediate
 *     `order_negotiations` row (proposed_by: "client"), same as that
 *     action's `intent === "negotiate"` branch. Negotiation starts the
 *     moment the order is created, with the client's own number as the
 *     opening move.
 * `proposed_price_usd` is always set to the system's own estimate (see
 * ./pricing.ts), recomputed HERE from `offeringKey`/`durationSec` rather
 * than trusted from the client - same "never trust a client-submitted
 * price" posture calculateEstimate's server-side call already has on
 * the full site. `orders.budget` (a freeform text column) gets a short
 * human summary of that estimate for staff visibility, since this app
 * doesn't have a structured "estimated price" column of its own to
 * write to beyond `proposed_price_usd`.
 *
 * The insert itself relies on `orders_insert_own`
 * (packages/db/migrations/0020_lock_down_payment_rls.sql, which
 * explicitly allows `status in ('pending_review', 'negotiating')` at
 * insert time - exactly the two values this action ever sets) - no new
 * migration or RPC needed for the insert. `order_negotiations`' own
 * insert policy (0013) only checks order ownership, not order status, so
 * inserting the opening offer right after the order itself is safe. The
 * Discord thread-id persist step mirrors submit-order-action.ts exactly:
 * it goes through `set_order_discord_thread_id` (SECURITY DEFINER,
 * migration 0026) because `orders_update_admin_only` blocks a
 * client-side raw UPDATE on `orders` entirely.
 */
export async function createOrderAction(fields: CreateOrderFields): Promise<CreateOrderResult> {
  const fullName = fields.fullName.trim();
  const email = fields.email.trim();
  const description = fields.description.trim();
  if (!fullName || !email || !description) {
    return { success: false, error: "Name, email, and project details are required." };
  }

  const clientOfferUsd =
    fields.clientOfferUsd != null && Number.isFinite(fields.clientOfferUsd) && fields.clientOfferUsd > 0
      ? fields.clientOfferUsd
      : null;

  const durationSec = isValidDuration(fields.durationSec) ? fields.durationSec : "10";
  const estimatedPriceUsd = estimatePriceUsd(fields.offeringKey, durationSec);

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) {
    return { success: false, error: clientError?.message ?? "Client profile not found." };
  }

  const { data: orderData, error } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      full_name: fullName,
      email,
      whatsapp: fields.whatsapp.trim() || null,
      country: fields.country.trim() || null,
      budget: `Estimate: $${estimatedPriceUsd.toLocaleString("en-US")} (${durationSec} sec)`,
      deadline: fields.deadline || null,
      description: `[${fields.offeringLabel} — ${durationSec} sec] ${description}`,
      reference_link: fields.referenceLink.trim() || null,
      status: clientOfferUsd != null ? "negotiating" : "pending_review",
      proposed_price_usd: estimatedPriceUsd,
    })
    .select("id")
    .single();

  if (error || !orderData) {
    return { success: false, error: error?.message ?? "Could not create the order." };
  }
  const orderId = (orderData as { id: string }).id;

  if (clientOfferUsd != null) {
    const { error: negotiationError } = await supabase.from("order_negotiations").insert({
      order_id: orderId,
      proposed_by: "client",
      amount_usd: clientOfferUsd,
    });
    if (negotiationError) {
      // The order itself already exists at this point - same softer
      // message apps/app's own submitOrderAction gives for this exact
      // failure, rather than pretending nothing was saved.
      return {
        success: false,
        error:
          "Your order was saved, but sending your offer failed. You can open negotiation for it again from Orders.",
      };
    }
  }

  // Best-effort, same posture as apps/app's own call - notifyNewOrder
  // never throws internally (see packages/discord/src/notify.ts), and
  // this try/catch means even an unexpected failure here can never turn
  // an already-saved order into a failed response to the client. NOTE
  // (honest gap, not silently assumed working): this requires
  // apps/miniapp's OWN Vercel project to have its own
  // DISCORD_BOT_TOKEN/channel env vars configured - this monorepo's "one
  // app = one Vercel project, independent env vars" convention means
  // they are NOT inherited from apps/app just because both apps import
  // the same @nimia/discord package.
  try {
    const { threadId } = await notifyNewOrder({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: fullName,
      serviceName: fields.offeringLabel,
      amountUsd: clientOfferUsd ?? estimatedPriceUsd,
      isNegotiation: clientOfferUsd != null,
    });
    if (threadId) {
      const { error: threadError } = await supabase.rpc("set_order_discord_thread_id", {
        p_order_id: orderId,
        p_thread_id: threadId,
      });
      if (threadError) {
        console.error("[discord] Failed to persist order thread id", orderId, threadError);
      }
    }
  } catch (notifyError) {
    console.error(`[discord] Failed to send new-order notification for order ${orderId}`, notifyError);
  }

  return { success: true, orderId };
}
