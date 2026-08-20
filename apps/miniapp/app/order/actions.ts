"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { notifyNewOrder } from "@nimia/discord";

export type CreateOrderResult = { success: true; orderId: string } | { success: false; error: string };

export interface CreateOrderFields {
  offeringLabel: string;
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  budget: string;
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
 * Crypto GIFs), where pricing is intentionally NOT computed client-side
 * - Nimia Studio quotes and negotiates every one of these by hand (see
 * app/page.tsx's "flexible, negotiable" pitch). `service_id` is left
 * null since neither offering exists as a `public.services` row (see
 * app/services/page.tsx's own comment) - the offering type is folded
 * into `description` instead so staff still see it at a glance.
 *
 * The insert itself relies on `orders_insert_own`
 * (packages/db/migrations/0006_rls_policies.sql) - no new migration or
 * RPC needed there. The Discord thread-id persist step below mirrors
 * apps/app/modules/order/state/submit-order-action.ts exactly: it goes
 * through `set_order_discord_thread_id` (SECURITY DEFINER, migration
 * 0026) because `orders_update_admin_only` blocks a client-side raw
 * UPDATE on `orders` entirely.
 */
export async function createOrderAction(fields: CreateOrderFields): Promise<CreateOrderResult> {
  const fullName = fields.fullName.trim();
  const email = fields.email.trim();
  const description = fields.description.trim();
  if (!fullName || !email || !description) {
    return { success: false, error: "Name, email, and project details are required." };
  }

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
      budget: fields.budget.trim() || null,
      deadline: fields.deadline || null,
      description: `[${fields.offeringLabel}] ${description}`,
      reference_link: fields.referenceLink.trim() || null,
    })
    .select("id")
    .single();

  if (error || !orderData) {
    return { success: false, error: error?.message ?? "Could not create the order." };
  }
  const orderId = (orderData as { id: string }).id;

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
      amountUsd: null,
      isNegotiation: true,
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
