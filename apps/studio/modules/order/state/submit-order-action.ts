"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { findServiceById, getCategory } from "../data/catalog";
import { calculateEstimate } from "../pricing/calculate-estimate";
import { summarizeSelections } from "../pricing/summarize-selections";
import type { ConfigSelections, ProjectBrief } from "../types/order-state";
import type { SubmitIntent } from "./use-order-wizard";

export interface SubmitOrderActionInput {
  intent: SubmitIntent;
  categoryId: string | null;
  serviceId: string | null;
  packageId: string | null;
  configSelections: ConfigSelections;
  brief: ProjectBrief;
  negotiationOffer: string;
}

export type SubmitOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

/** ProjectBriefForm's deadline field is a native `<input type="date">` (see
 * project-brief-form.tsx), so it already arrives as a well-formed
 * "YYYY-MM-DD" string or an empty string — this just normalizes the empty
 * case to null for the `date` column, and falls back to null instead of
 * throwing if it's ever anything else. */
function parseDeadline(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed;
}

/** Builds the `orders.description` text. The /order configurator's Step 4
 * config selections and Step 3 package tier have no dedicated columns on
 * `orders` (that table predates this configurator — see
 * 0003_orders_projects.sql) — everything the team needs to fulfill the
 * order is folded into this one NOT NULL text field instead. */
function buildDescription(params: {
  categoryName: string;
  serviceName: string;
  packageLabel: string | null;
  brief: ProjectBrief;
  selections: Array<{ label: string; value: string }>;
}): string {
  const { categoryName, serviceName, packageLabel, brief, selections } = params;
  const lines: string[] = [
    `Project: ${brief.projectTitle.trim()}`,
    `Category / Service: ${categoryName}, ${serviceName}${packageLabel ? ` (${packageLabel})` : ""}`,
  ];
  if (brief.targetPlatform.trim()) lines.push(`Target Platform: ${brief.targetPlatform.trim()}`);
  lines.push("", "Description:", brief.projectDescription.trim());
  if (brief.additionalNotes.trim()) {
    lines.push("", "Additional Notes:", brief.additionalNotes.trim());
  }
  if (selections.length > 0) {
    lines.push("", "Configuration:");
    for (const row of selections) lines.push(`- ${row.label}: ${row.value}`);
  }
  return lines.join("\n");
}

// Real order-submission action for /order's Project Configurator (3 Agustus
// 2026, per user request). Replaces useOrderWizard's previous
// window.setTimeout local-only simulation, which never wrote to Supabase —
// that's why a negotiated order used to show up nowhere in the dashboard.
// Writes a real `orders` row (service_id is now a real FK — see
// modules/order/types/catalog.ts's `dbServiceId` field and
// packages/db/migrations/0018_order_catalog_services_seed.sql) and, when the
// client used "Negotiate Price" instead of "Submit Order", an
// `order_negotiations` row too, so app/dashboard/orders and
// app/dashboard/negotiations actually have something to show.
//
// Known gap: attached files (Step 6, upload-section.tsx) are NOT uploaded to
// Supabase Storage here. The wizard only ever kept them as in-memory File
// blobs (state/use-order-wizard.ts's fileBlobs, never persisted, not even
// across the login redirect), and no Storage bucket/upload flow exists for
// this module yet. `order_files` rows are intentionally not inserted —
// revisit once real file upload is wired in.
export async function submitOrderAction(input: SubmitOrderActionInput): Promise<SubmitOrderResult> {
  const category = getCategory(input.categoryId);
  const service = findServiceById(input.serviceId);
  if (!category || !service) {
    return { ok: false, error: "Select a category and service before submitting." };
  }
  if (!input.brief.projectTitle.trim() || !input.brief.projectDescription.trim()) {
    return { ok: false, error: "Add a project title and description before submitting." };
  }

  let negotiationAmount: number | null = null;
  if (input.intent === "negotiate") {
    const parsed = Number(input.negotiationOffer.trim());
    if (!input.negotiationOffer.trim() || Number.isNaN(parsed) || parsed <= 0) {
      return {
        ok: false,
        error: "Enter the price you'd like to offer before submitting for negotiation.",
      };
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

  // Same two-query shape as app/dashboard/layout.tsx's profile fetch —
  // `users` (full_name) and `clients` (company_name/whatsapp/country) are
  // separate tables, no embed needed since both are looked up by the same
  // auth user id.
  const [{ data: profile }, { data: client, error: clientError }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, company_name, whatsapp, country").eq("user_id", user.id).single(),
  ]);

  if (clientError || !client) {
    return { ok: false, error: "Couldn't find your client profile. Please try signing in again." };
  }

  const selectedPackage =
    service.pricingModel === "packages"
      ? service.packages?.find((pkg) => pkg.id === input.packageId) ?? service.packages?.[0] ?? null
      : null;
  const estimate = calculateEstimate(service, input.packageId, input.configSelections);
  const selections = summarizeSelections(service, input.configSelections);

  const description = buildDescription({
    categoryName: category.name,
    serviceName: service.name,
    packageLabel: selectedPackage ? `${selectedPackage.name}, ${selectedPackage.quantityLabel}` : null,
    brief: input.brief,
    selections,
  });

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      service_id: service.dbServiceId,
      full_name: profile?.full_name ?? "Nimia Client",
      company_name: client.company_name,
      email: user.email ?? "",
      whatsapp: client.whatsapp,
      country: client.country,
      deadline: parseDeadline(input.brief.deadline),
      description,
      reference_link: input.brief.referenceLink.trim() || null,
      status: input.intent === "negotiate" ? "negotiating" : "pending_review",
      proposed_price_usd: estimate.totalPrice,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    return { ok: false, error: "Something went wrong submitting your order. Please try again." };
  }

  if (input.intent === "negotiate" && negotiationAmount !== null) {
    const { error: negotiationError } = await supabase.from("order_negotiations").insert({
      order_id: order.id,
      proposed_by: "client",
      amount_usd: negotiationAmount,
    });
    if (negotiationError) {
      // The order itself already exists at this point — a softer message
      // than pretending nothing was saved at all.
      return {
        ok: false,
        error:
          "Your order was saved, but sending your offer failed. You can open a negotiation for it again from your dashboard.",
      };
    }
  }

  return { ok: true, orderId: order.id };
}
