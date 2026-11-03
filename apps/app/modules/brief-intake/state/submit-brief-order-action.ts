"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { notifyNewOrder } from "@nimia/discord";
import { sendOrderReceivedEmail } from "../../../lib/email";
import { buildBriefSchema, isOwnCloudinaryUpload, type BriefInput } from "../schema";
import {
  buildBriefBudgetText,
  buildBriefDescription,
  buildBriefDisplayName,
  formatOrderCode,
} from "../format";

// Creates an order from the short intake (Tahap 2). Deliberately narrow:
//   - no price is computed or stored (budget is a range in orders.budget,
//     proposed_price_usd/final_price_usd stay null) — the price is agreed
//     later in the negotiation, never derived from the budget;
//   - payment_method stays null, so no installments are materialized and
//     the existing single-payment path applies until payment terms become
//     part of the offer (Tahap 3);
//   - status 'negotiating' (not 'pending_review') + all payment fields
//     null, which the orders_insert_own RLS policy (0020) allows. Reason:
//     on the existing platform only a 'negotiating' order lets staff send
//     an offer that the CLIENT then accepts or counters (admin
//     sendCounterOfferAction -> client accept_negotiation_offer). A
//     'pending_review' order is priced by admin directly
//     (sendQuotationForPaymentAction) with no client approval, which the
//     approved flow forbids ("klien menyetujui penawaran terbaru"). No
//     order_negotiations row is written here: the budget is not an offer.
// Requires migration 0056 (order_flow_type 'brief').

export type SubmitBriefOrderResult =
  | { ok: true; orderId: string; orderCode: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitBriefOrderAction(input: BriefInput): Promise<SubmitBriefOrderResult> {
  const parsed = buildBriefSchema().safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Some details need another look.", fieldErrors };
  }
  const brief = parsed.data;

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session expired. Log in again to send your brief." };
  }

  if (brief.files.some((file) => !isOwnCloudinaryUpload(file.url, user.id))) {
    return { ok: false, error: "One of the attachments wasn't uploaded here. Remove it and attach it again." };
  }

  const [{ data: profile }, { data: client, error: clientError }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, company_name, whatsapp, country").eq("user_id", user.id).single(),
  ]);
  if (clientError || !client) {
    return { ok: false, error: "Your client profile couldn't be found. Log out, log in again, and retry." };
  }

  const clientName = profile?.full_name ?? "Nimia Client";
  const description = buildBriefDescription(brief);
  const displayName = buildBriefDisplayName(brief);

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      service_id: null,
      package_name: displayName,
      order_flow_type: "brief",
      full_name: clientName,
      company_name: client.company_name,
      email: user.email ?? "",
      whatsapp: client.whatsapp,
      country: client.country,
      budget: buildBriefBudgetText(brief.budget),
      deadline: brief.deadline || null,
      description,
      reference_link: brief.referenceLink || null,
      status: "negotiating",
    })
    .select("id")
    .single();

  if (insertError || !order) {
    console.error("[brief-intake] order insert failed", insertError);
    return { ok: false, error: "Your brief couldn't be sent. Nothing was saved, so you can try again." };
  }

  const orderCode = formatOrderCode(order.id);

  if (brief.files.length > 0) {
    const { error: filesError } = await supabase.from("order_files").insert(
      brief.files.map((file) => ({
        order_id: order.id,
        file_name: file.name,
        file_url: file.url,
        is_character_reference: false,
      })),
    );
    if (filesError) {
      // The order itself is saved; staff can request files again.
      console.error("[brief-intake] linking files failed", order.id, filesError);
    }
  }

  if (user.email) {
    await sendOrderReceivedEmail(user.email, {
      clientName,
      serviceName: displayName,
      orderId: orderCode,
      submittedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
      description,
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.nimiastudio.com"}/dashboard/orders`,
    });
  }

  const { threadId } = await notifyNewOrder({
    orderId: orderCode,
    clientName,
    serviceName: displayName,
    amountUsd: null,
    isNegotiation: false,
  });
  if (threadId) {
    const { error: threadError } = await supabase.rpc("set_order_discord_thread_id", {
      p_order_id: order.id,
      p_thread_id: threadId,
    });
    if (threadError) {
      console.error("[brief-intake] saving discord thread id failed", order.id, threadError);
    }
  }

  return { ok: true, orderId: order.id, orderCode };
}
