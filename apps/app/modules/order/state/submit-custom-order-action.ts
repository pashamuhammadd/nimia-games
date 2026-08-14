"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { getCategory, findServiceById } from "../data/catalog";
import { calculateEstimate } from "../pricing/calculate-estimate";
import { summarizeSelections } from "../pricing/summarize-selections";
import type { CustomServiceSelection, CustomOrderPaymentMethod } from "../types/custom-order";
import type { ProjectBrief } from "../types/order-state";
import type { SubmitIntent } from "./use-order-wizard";
import { sendOrderReceivedEmail } from "../../../lib/email";
import { notifyNewOrder } from "@nimia/discord";

export interface SubmitCustomOrderActionInput {
  intent: SubmitIntent;
  selections: CustomServiceSelection[];
  paymentMethod: CustomOrderPaymentMethod | null;
  brief: ProjectBrief;
  negotiationOffer: string;
  uploadedFiles: { name: string; url: string }[];
  agreedToTerms: boolean;
}

export type SubmitCustomOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

function parseDeadline(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed;
}

/** Builds `orders.description` — same "fold everything into this one
 * free-text field" pattern as submit-order-action.ts's buildDescription/
 * buildBundleDescription, extended for N services instead of one. The
 * per-service structured data ALSO gets its own order_service_selections
 * row (see below) — this text remains the human-readable summary staff
 * actually reads day to day, exactly like it already is for every other
 * order type. */
function buildCustomOrderDescription(params: {
  lines: { categoryName: string; serviceName: string; packageLabel: string | null; rows: { label: string; value: string }[] }[];
  brief: ProjectBrief;
}): string {
  const { lines, brief } = params;
  const out: string[] = [
    `Project: ${brief.projectTitle.trim()}`,
    `Order Type: Custom Order (${lines.length} service${lines.length === 1 ? "" : "s"})`,
  ];
  if (brief.targetPlatform.trim()) out.push(`Target Platform: ${brief.targetPlatform.trim()}`);
  out.push("", "Description:", brief.projectDescription.trim());
  if (brief.additionalNotes.trim()) out.push("", "Additional Notes:", brief.additionalNotes.trim());

  for (const line of lines) {
    out.push("", `— ${line.categoryName} / ${line.serviceName}${line.packageLabel ? ` (${line.packageLabel})` : ""} —`);
    for (const row of line.rows) out.push(`- ${row.label}: ${row.value}`);
  }

  return out.join("\n");
}

/** Reuses `orders.package_name` (0036, extended for Custom Order display by
 * 0038's own column comment) as the summary label every existing "which
 * service is this order for" read site (receipt PDFs, both apps' Orders
 * lists/detail) already falls back to — e.g. "Custom Order: Animation,
 * Website Development". Category names deduped/ordered by first
 * appearance, not alphabetically, so it reads in the order the client
 * actually picked them. */
function buildCustomOrderLabel(categoryNames: string[]): string {
  const unique = Array.from(new Set(categoryNames));
  return `Custom Order: ${unique.join(", ")}`;
}

// Custom Order Builder's real order-submission action (12 Agustus 2026),
// mirroring submit-order-action.ts's exact structure and trust posture:
// the client's own computed numbers are NEVER inserted directly — every
// line price, the subtotal, and the installment fee are all recomputed
// HERE, server-side, from the same shared catalog/pricing functions
// Project Builder already uses (calculateEstimate) plus a fresh read of
// the admin-configurable fee percentage — matching spec section 6/27's
// explicit "server must recalculate before the order is saved, never
// trust the client's total" requirement.
export async function submitCustomOrderAction(
  input: SubmitCustomOrderActionInput,
): Promise<SubmitCustomOrderResult> {
  if (!input.agreedToTerms) {
    return { ok: false, error: "Please agree to Nimia Studio's project terms before submitting." };
  }
  if (input.selections.length === 0) {
    return { ok: false, error: "Add at least one service before submitting." };
  }
  if (!input.paymentMethod) {
    return { ok: false, error: "Choose a payment method before submitting." };
  }
  if (!input.brief.projectTitle.trim() || !input.brief.projectDescription.trim()) {
    return { ok: false, error: "Add a project title and description before submitting." };
  }

  let negotiationAmount: number | null = null;
  if (input.intent === "negotiate") {
    const parsed = Number(input.negotiationOffer.trim());
    if (!input.negotiationOffer.trim() || Number.isNaN(parsed) || parsed <= 0) {
      return { ok: false, error: "Enter the price you'd like to offer before submitting for negotiation." };
    }
    negotiationAmount = parsed;
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in before submitting an order." };
  }

  const [{ data: profile }, { data: client, error: clientError }, { data: feeSettings }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, company_name, whatsapp, country").eq("user_id", user.id).single(),
    supabase.from("installment_settings").select("fee_percentage").eq("id", true).single(),
  ]);

  if (clientError || !client) {
    return { ok: false, error: "Couldn't find your client profile. Please try signing in again." };
  }

  const feePercentage = Number(feeSettings?.fee_percentage ?? 30);

  // Server-side recompute — the ONLY numbers that ever reach `orders`,
  // order_service_selections, and order_price_breakdown below. Any
  // selection whose category/service can no longer be resolved (catalog
  // edited/removed since the client loaded it) is silently dropped, same
  // defensive posture calculate-custom-order-estimate.ts's client-side
  // twin already has.
  type ResolvedLine = {
    categoryId: string;
    categoryName: string;
    serviceId: string;
    serviceName: string;
    packageId: string | null;
    packageLabel: string | null;
    configSelections: CustomServiceSelection["configSelections"];
    linePrice: number;
    deliveryDays: number;
    rows: { label: string; value: string }[];
  };

  const resolvedLines: ResolvedLine[] = [];
  for (const selection of input.selections) {
    const category = getCategory(selection.categoryId);
    const service = findServiceById(selection.serviceId);
    if (!category || !service) continue;

    const estimate = calculateEstimate(service, selection.packageId, selection.configSelections);
    const selectedPackage =
      service.pricingModel === "packages"
        ? service.packages?.find((pkg) => pkg.id === selection.packageId) ?? service.packages?.[0] ?? null
        : null;

    resolvedLines.push({
      categoryId: category.id,
      categoryName: category.name,
      serviceId: service.id,
      serviceName: service.name,
      packageId: selectedPackage?.id ?? null,
      packageLabel: selectedPackage ? `${selectedPackage.name} (${selectedPackage.quantityLabel})` : null,
      configSelections: selection.configSelections,
      linePrice: estimate.totalPrice,
      deliveryDays: estimate.totalDeliveryDays,
      rows: summarizeSelections(service, selection.configSelections),
    });
  }

  if (resolvedLines.length === 0) {
    return { ok: false, error: "None of the selected services could be found. Please rebuild your order." };
  }

  const subtotal = resolvedLines.reduce((sum, line) => sum + line.linePrice, 0);
  const installmentFeeAmount =
    input.paymentMethod === "installments" ? Math.round(((subtotal * feePercentage) / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + installmentFeeAmount) * 100) / 100;

  const clientName = profile?.full_name ?? "Nimia Client";
  const packageNameLabel = buildCustomOrderLabel(resolvedLines.map((line) => line.categoryName));
  const description = buildCustomOrderDescription({
    lines: resolvedLines.map((line) => ({
      categoryName: line.categoryName,
      serviceName: line.serviceName,
      packageLabel: line.packageLabel,
      rows: line.rows,
    })),
    brief: input.brief,
  });

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      service_id: null,
      order_flow_type: "custom",
      payment_method: input.paymentMethod,
      package_name: packageNameLabel,
      full_name: clientName,
      company_name: client.company_name,
      email: user.email ?? "",
      whatsapp: client.whatsapp,
      country: client.country,
      deadline: parseDeadline(input.brief.deadline),
      description,
      reference_link: input.brief.referenceLink.trim() || null,
      status: input.intent === "negotiate" ? "negotiating" : "pending_review",
      proposed_price_usd: total,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    return { ok: false, error: "Something went wrong submitting your order. Please try again." };
  }

  // order_service_selections — one row per resolved line, server-computed
  // price/delivery only (see packages/db/migrations/0038's own comment on
  // why this table is client-INSERT-able via RLS despite carrying a price:
  // same trust tier as orders.proposed_price_usd, not the authoritative
  // final_price_usd Admin sets later).
  const { error: selectionsError } = await supabase.from("order_service_selections").insert(
    resolvedLines.map((line, index) => ({
      order_id: order.id,
      category_id: line.categoryId,
      service_id: line.serviceId,
      service_name: line.serviceName + (line.packageLabel ? ` — ${line.packageLabel}` : ""),
      config_selections: line.configSelections,
      line_price_usd: line.linePrice,
      delivery_days: line.deliveryDays,
      sort_order: index,
    })),
  );
  if (selectionsError) {
    console.error("[order_service_selections] Failed to save Custom Order service lines", order.id, selectionsError);
  }

  // order_price_breakdown — spec section 21: never store only a total.
  type BreakdownRow = {
    order_id: string;
    kind: "base_service" | "installment_fee";
    label: string;
    amount_usd: number;
    sort_order: number;
  };
  const breakdownRows: BreakdownRow[] = resolvedLines.map((line, index) => ({
    order_id: order.id,
    kind: "base_service",
    label: `${line.categoryName} — ${line.serviceName}${line.packageLabel ? ` (${line.packageLabel})` : ""}`,
    amount_usd: line.linePrice,
    sort_order: index,
  }));
  if (installmentFeeAmount > 0) {
    breakdownRows.push({
      order_id: order.id,
      kind: "installment_fee",
      label: `Installment Flexibility Fee (${feePercentage}%)`,
      amount_usd: installmentFeeAmount,
      sort_order: breakdownRows.length,
    });
  }
  const { error: breakdownError } = await supabase.from("order_price_breakdown").insert(breakdownRows);
  if (breakdownError) {
    console.error("[order_price_breakdown] Failed to save Custom Order price breakdown", order.id, breakdownError);
  }

  if (input.intent === "negotiate" && negotiationAmount !== null) {
    const { error: negotiationError } = await supabase.from("order_negotiations").insert({
      order_id: order.id,
      proposed_by: "client",
      amount_usd: negotiationAmount,
      payment_method: input.paymentMethod,
    });
    if (negotiationError) {
      return {
        ok: false,
        error:
          "Your order was saved, but sending your offer failed. You can open a negotiation for it again from your dashboard.",
      };
    }
  }

  if (input.uploadedFiles.length > 0) {
    const { error: filesError } = await supabase.from("order_files").insert(
      input.uploadedFiles.map((file) => ({
        order_id: order.id,
        file_name: file.name,
        file_url: file.url,
      })),
    );
    if (filesError) {
      console.error("[order_files] Failed to link uploaded files to Custom Order", order.id, filesError);
    }
  }

  if (user.email) {
    await sendOrderReceivedEmail(user.email, {
      clientName,
      serviceName: packageNameLabel,
      orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
      description,
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.nimiastudio.com"}/dashboard/orders`,
    });
  }

  const { threadId } = await notifyNewOrder({
    orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
    clientName,
    serviceName: packageNameLabel,
    amountUsd: negotiationAmount ?? total,
    isNegotiation: input.intent === "negotiate",
  });

  if (threadId) {
    const { error: threadError } = await supabase.rpc("set_order_discord_thread_id", {
      p_order_id: order.id,
      p_thread_id: threadId,
    });
    if (threadError) {
      console.error("[discord] Failed to persist Custom Order thread id", order.id, threadError);
    }
  }

  return { ok: true, orderId: order.id };
}
