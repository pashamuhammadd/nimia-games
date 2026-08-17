"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { creativeSessionRepository } from "../repository/creative-session.repository";
import { structuredDataRows } from "../lib/structured-data-fields";
import type { CreativeAgentPaymentMethod, StructuredProjectData, UploadedAsset } from "../types";
import { CREATIVE_AGENT_SESSION_COOKIE } from "../constants";
import { sendOrderReceivedEmail } from "../../../lib/email";
import { notifyNewOrder } from "@nimia/discord";

export type CreativeAgentOrderIntent = "submit" | "negotiate";

export interface SubmitCreativeAgentOrderActionInput {
  intent: CreativeAgentOrderIntent;
  /** Pay in Full vs Pay in Installments (16 Agustus 2026, Fase 6 — see
   * FASE0-AUDIT.md's Implementation Order item 6 / order_flow_simulation_
   * 16agst.md's audit finding: Creative Agent had no payment method step
   * at all). Same required-before-submit posture every other order path's
   * submit action already has (see modules/order/state/submit-order-
   * action.ts's identical check) — SERVER is the real gate, per this
   * codebase's standing convention; the client-side disabled-button check
   * in CreativeBriefCard is UX only. */
  paymentMethod: CreativeAgentPaymentMethod | null;
  negotiationOfferUsd: string;
  agreedToTerms: boolean;
}

export type SubmitCreativeAgentOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; requiresAuth?: true };

function parseDeadline(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed;
}

/** Builds `orders.description` for a Creative-Agent-sourced order — same
 * "fold everything into this one free-text field" pattern as modules/
 * order/state/submit-custom-order-action.ts's buildCustomOrderDescription,
 * but from the AI's structured_data instead of the wizard's catalog
 * selections. Reuses structuredDataRows (lib/structured-data-fields.ts) so
 * this text never disagrees with what CreativeBriefCard actually showed
 * the client before they clicked Submit. */
function buildCreativeAgentOrderDescription(params: {
  structuredData: StructuredProjectData;
  uploadedAssets: UploadedAsset[];
}): string {
  const { structuredData, uploadedAssets } = params;
  const out: string[] = ["Source: Nimia Creative Agent (AI intake, homepage)", ""];

  // briefSummary (P9, 13 Agustus 2026) leads the description — the whole
  // point of adding it was so Admin reads a real paragraph first, not just
  // a field-by-field dump (see project memory's log for the original user
  // complaint this fixes: "admin gak nerima script animasinya juga").
  // apps/admin's OrderDetailPanel.tsx renders `description` verbatim with
  // `whitespace-pre-wrap` already, so this reaches Admin with zero changes
  // needed on that side — confirmed by reading that component before
  // building this.
  if (structuredData.briefSummary) {
    out.push(structuredData.briefSummary, "");
  }

  if (structuredData.estimatedPriceRange) {
    out.push(
      `Nimia Creative Agent's rough estimate: ${structuredData.estimatedPriceRange} (courtesy estimate only — ` +
        "confirm real pricing with the client before quoting).",
      "",
    );
  }

  for (const row of structuredDataRows(structuredData)) {
    out.push(`${row.label}: ${row.value}`);
  }

  if (uploadedAssets.length > 0) {
    out.push("", "Attached files:");
    for (const file of uploadedAssets) out.push(`- ${file.name}: ${file.url}`);
  }

  return out.join("\n");
}

// Creative Agent's own order-submission action (P7, 13 Agustus 2026) —
// deliberately a separate action from modules/order/state/submit-custom-
// order-action.ts, not a variant of it. That action's `selections` are
// resolved against the real service catalog (getCategory/findServiceById)
// with server-recomputed prices; a Creative Agent brief is freeform AI-
// extracted text with no catalog line items to price against. Forcing it
// through the same action would mean either inventing a fake catalog
// match (fragile, easy to misprice) or stripping that action down until
// it barely resembled itself. Instead: same TRUST POSTURE (auth required,
// same `clients` lookup, same orders/order_negotiations/order_files
// tables, same email+Discord notify), just no price computed —
// `proposed_price_usd` stays null and `status` stays 'pending_review' (or
// 'negotiating' with the client's own stated offer), exactly the outcome
// the product decision (13 Agustus 2026) asked for: require sign-in like
// every other order path, but never fabricate a catalog-based price for a
// conversation that was never priced against the catalog.
export async function submitCreativeAgentOrderAction(
  input: SubmitCreativeAgentOrderActionInput,
): Promise<SubmitCreativeAgentOrderResult> {
  if (!input.agreedToTerms) {
    return { ok: false, error: "Please agree to Nimia Studio's project terms before submitting." };
  }
  // 16 Agustus 2026 (Fase 6) — same validation every other order path's
  // submit action already has (see submit-order-action.ts /
  // submit-custom-order-action.ts's identical check, generalized 15
  // Agustus 2026).
  if (!input.paymentMethod) {
    return { ok: false, error: "Choose a payment method before submitting." };
  }

  let negotiationAmount: number | null = null;
  if (input.intent === "negotiate") {
    const parsed = Number(input.negotiationOfferUsd.trim());
    if (!input.negotiationOfferUsd.trim() || Number.isNaN(parsed) || parsed <= 0) {
      return { ok: false, error: "Enter the price you'd like to offer before submitting for negotiation." };
    }
    negotiationAmount = parsed;
  }

  const sessionToken = (await cookies()).get(CREATIVE_AGENT_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return { ok: false, error: "Please start a conversation with Nimia Creative Agent first." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Not a hard error — the UI's job is to redirect to /login and let the
    // client come straight back (see CreativeAgentSection, mirroring
    // modules/order's own use-order-wizard.ts redirect). The session's
    // messages/structured_data/uploaded_assets already live server-side
    // keyed by the still-present cookie, so nothing is lost across that
    // redirect — the client just clicks Submit/Negotiate again themselves
    // once back, same as the existing Order Wizard already works.
    return { ok: false, error: "Please sign in to submit your project.", requiresAuth: true };
  }

  const [{ data: profile }, { data: client, error: clientError }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, company_name, whatsapp, country").eq("user_id", user.id).single(),
  ]);

  if (clientError || !client) {
    return { ok: false, error: "Couldn't find your client profile. Please try signing in again." };
  }

  const session = await creativeSessionRepository.getOrCreateSession(sessionToken);

  // Idempotency: a second click (double-submit, back button, resuming
  // after the /login redirect and clicking again) returns the order that
  // already exists instead of creating a duplicate.
  if (session.orderId) {
    return { ok: true, orderId: session.orderId };
  }
  if (session.status !== "confirmed") {
    return { ok: false, error: "Please confirm your brief with Nimia Creative Agent before submitting." };
  }

  const clientName = profile?.full_name ?? "Nimia Client";
  const serviceLabel = session.structuredData.service?.trim() || "Custom Project";
  const packageNameLabel = `Creative Agent Brief: ${serviceLabel}`;
  const description = buildCreativeAgentOrderDescription({
    structuredData: session.structuredData,
    uploadedAssets: session.uploadedAssets,
  });

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      service_id: null,
      // 16 Agustus 2026 (Fase 7, Unified Order Creation) — was "custom"
      // until this migration, indistinguishable from a real Custom Order
      // Builder submission. See 0047_creative_agent_order_flow_type.sql's
      // own header comment for the full review this came out of.
      order_flow_type: "creative_agent",
      // Payment Method (16 Agustus 2026, Fase 6) — same trust tier as every
      // other order path's payment_method: the client's own stated intent,
      // not authoritative; Admin can still change it during review. Safe to
      // set here even though proposed_price_usd stays null (see this file's
      // own header comment) — derive_order_normal_price() (0038) only acts
      // once final_price_usd is ALSO set, which happens later when Admin
      // quotes, so this just sits ready for that trigger rather than
      // needing to fire anything now.
      payment_method: input.paymentMethod,
      package_name: packageNameLabel,
      full_name: clientName,
      company_name: client.company_name,
      email: user.email ?? "",
      whatsapp: client.whatsapp,
      country: client.country,
      budget: session.structuredData.budget,
      deadline: parseDeadline(session.structuredData.deadline),
      description,
      reference_link: session.structuredData.references?.[0]?.trim() || null,
      status: input.intent === "negotiate" ? "negotiating" : "pending_review",
      proposed_price_usd: null,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    console.error("[creative-agent] Failed to create order from session", session.id, insertError);
    return { ok: false, error: "Something went wrong submitting your order. Please try again." };
  }

  if (input.intent === "negotiate" && negotiationAmount !== null) {
    const { error: negotiationError } = await supabase.from("order_negotiations").insert({
      order_id: order.id,
      proposed_by: "client",
      amount_usd: negotiationAmount,
      // 16 Agustus 2026 (Fase 6) — same field submit-custom-order-action.ts
      // already sets on its own order_negotiations insert.
      payment_method: input.paymentMethod,
    });
    if (negotiationError) {
      console.error("[order_negotiations] Failed to save Creative Agent negotiation offer", order.id, negotiationError);
    }
  }

  if (session.uploadedAssets.length > 0) {
    const { error: filesError } = await supabase.from("order_files").insert(
      session.uploadedAssets.map((file) => ({
        order_id: order.id,
        file_name: file.name,
        file_url: file.url,
      })),
    );
    if (filesError) {
      console.error("[order_files] Failed to link Creative Agent uploads to order", order.id, filesError);
    }
  }

  try {
    await creativeSessionRepository.linkOrder(sessionToken, order.id);
  } catch (error) {
    // The order itself is already safely created at this point — a failed
    // link means a retried click could theoretically create a second
    // order, which is an acceptable rare edge case (Admin can merge/close
    // duplicates) next to the alternative of the whole submission failing
    // after the order already exists.
    console.error("[creative-agent] Order created but failed to link back to session", order.id, error);
  }

  if (user.email) {
    await sendOrderReceivedEmail(user.email, {
      clientName,
      serviceName: packageNameLabel,
      orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
      description,
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.nimiagames.com"}/dashboard/orders`,
    });
  }

  const { threadId } = await notifyNewOrder({
    orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
    clientName,
    serviceName: packageNameLabel,
    amountUsd: negotiationAmount,
    isNegotiation: input.intent === "negotiate",
    // 16 Agustus 2026 (Fase 6, Discord alignment) — same field every other
    // order path's notifyNewOrder call already passes (15 Agustus 2026
    // pass), lets #new-orders show Full Payment vs Installments at a
    // glance for Creative Agent orders too.
    paymentMethod: input.paymentMethod,
  });

  if (threadId) {
    const { error: threadError } = await supabase.rpc("set_order_discord_thread_id", {
      p_order_id: order.id,
      p_thread_id: threadId,
    });
    if (threadError) {
      console.error("[discord] Failed to persist Creative Agent order thread id", order.id, threadError);
    }
  }

  return { ok: true, orderId: order.id };
}
