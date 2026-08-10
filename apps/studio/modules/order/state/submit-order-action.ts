"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { findServiceById, getCategory } from "../data/catalog";
import { findBundlePackageById } from "../data/bundle-packages";
import { calculateEstimate } from "../pricing/calculate-estimate";
import { calculateBundleEstimate } from "../pricing/calculate-bundle-estimate";
import { summarizeSelections } from "../pricing/summarize-selections";
import type { ConfigSelections, ProjectBrief } from "../types/order-state";
import type { BundlePackage, BundleCreativeOption } from "../types/bundle";
import type { SubmitIntent } from "./use-order-wizard";
import { sendOrderReceivedEmail } from "../../../lib/email";
import { notifyNewOrder } from "@nimia/discord";

export interface SubmitOrderActionInput {
  intent: SubmitIntent;
  categoryId: string | null;
  serviceId: string | null;
  packageId: string | null;
  configSelections: ConfigSelections;
  /** Package/Bundle system (10 Agustus 2026). When set, this is a bundle
   * order: categoryId/serviceId/packageId/configSelections above are all
   * expected to be null/empty (see useOrderWizard#submit), and this action
   * skips the category/service lookup entirely — see isBundleOrder below. */
  bundlePackageId?: string | null;
  bundleCreativeContentIds?: string[];
  brief: ProjectBrief;
  negotiationOffer: string;
  /** Added 4 Agustus 2026 (P0.3) — already-uploaded Cloudinary URLs, one
   * per attachment. Uploading happens client-side in useOrderWizard's
   * submit() BEFORE this action is even called (see
   * get-upload-signature-action.ts / upload-to-cloudinary.ts) — by the
   * time this runs, there's nothing left to do with these but insert them
   * as `order_files` rows once the order itself exists. */
  uploadedFiles: { name: string; url: string }[];
  /** Added 9 Agustus 2026 (launch-readiness audit finding). Mirrors
   * `state.agreedToTerms` from ReviewSection's checkbox — useOrderWizard's
   * submit() already blocks the call client-side when this is false, but
   * that's only a client-side nicety (same as its negotiation-offer
   * amount check right above it in that file); this action re-validates
   * it below before ever writing an `orders` row, same defense-in-depth
   * pattern every other server action in this app already follows for
   * anything the client claims. */
  agreedToTerms: boolean;
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

/** Bundle counterpart to buildDescription above (Package/Bundle system, 10
 * Agustus 2026) — same "fold everything into orders.description" pattern,
 * carrying the package name/price, its fixed included items, the client's
 * slot-system creative-content picks, revisions, and the estimated delivery
 * range so the team has the full order context with zero schema changes. */
function buildBundleDescription(params: {
  pkg: BundlePackage;
  selectedOptions: BundleCreativeOption[];
  brief: ProjectBrief;
}): string {
  const { pkg, selectedOptions, brief } = params;
  const lines: string[] = [
    `Project: ${brief.projectTitle.trim()}`,
    `Package: ${pkg.name} ($${pkg.price})`,
  ];
  if (brief.targetPlatform.trim()) lines.push(`Target Platform: ${brief.targetPlatform.trim()}`);
  lines.push("", "Description:", brief.projectDescription.trim());
  if (brief.additionalNotes.trim()) {
    lines.push("", "Additional Notes:", brief.additionalNotes.trim());
  }
  lines.push("", "What's Included:");
  for (const item of pkg.includedItems) lines.push(`- ${item.label}`);
  lines.push("", `Creative Content Selected (${pkg.creativeSlotLabel}):`);
  if (selectedOptions.length > 0) {
    for (const option of selectedOptions) lines.push(`- ${option.label}`);
  } else {
    lines.push("- None selected");
  }
  lines.push("", `Free Revisions: ${pkg.freeRevisions}`);
  lines.push(`Estimated Delivery: ${pkg.estimatedDeliveryLabel} (estimate, not a guaranteed date)`);
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
// Package/Bundle system (10 Agustus 2026) — extended (not replaced) to also
// accept a bundle order. `orders.service_id` is nullable (see
// 0003_orders_projects.sql), and the existing "fold extra structured data
// into orders.description" pattern above already covers everything a
// bundle order needs to persist (packageId/packageName/packagePrice/
// selectedCreativeContent) — so no new Supabase migration was needed for
// this feature.
export async function submitOrderAction(input: SubmitOrderActionInput): Promise<SubmitOrderResult> {
  if (!input.agreedToTerms) {
    return { ok: false, error: "Please agree to Nimia Studio's project terms before submitting." };
  }

  const isBundleOrder = Boolean(input.bundlePackageId);

  let category: ReturnType<typeof getCategory> = null;
  let service: ReturnType<typeof findServiceById> = null;
  let bundlePkg: BundlePackage | null = null;

  if (isBundleOrder) {
    bundlePkg = findBundlePackageById(input.bundlePackageId ?? null);
    if (!bundlePkg) {
      return { ok: false, error: "Select a package before submitting." };
    }
  } else {
    category = getCategory(input.categoryId);
    service = findServiceById(input.serviceId);
    if (!category || !service) {
      return { ok: false, error: "Select a category and service before submitting." };
    }
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

  let description: string;
  let estimateTotalPrice: number;
  let serviceNameForNotifications: string;
  let selectedBundleOptions: BundleCreativeOption[] = [];

  if (isBundleOrder && bundlePkg) {
    selectedBundleOptions = bundlePkg.creativeOptions.filter((option) =>
      (input.bundleCreativeContentIds ?? []).includes(option.id),
    );
    const bundleEstimate = calculateBundleEstimate(bundlePkg);
    estimateTotalPrice = bundleEstimate.totalPrice;
    description = buildBundleDescription({
      pkg: bundlePkg,
      selectedOptions: selectedBundleOptions,
      brief: input.brief,
    });
    serviceNameForNotifications = bundlePkg.name;
  } else if (category && service) {
    const selectedPackage =
      service.pricingModel === "packages"
        ? service.packages?.find((pkg) => pkg.id === input.packageId) ?? service.packages?.[0] ?? null
        : null;
    const estimate = calculateEstimate(service, input.packageId, input.configSelections);
    const selections = summarizeSelections(service, input.configSelections);
    estimateTotalPrice = estimate.totalPrice;
    description = buildDescription({
      categoryName: category.name,
      serviceName: service.name,
      packageLabel: selectedPackage ? `${selectedPackage.name}, ${selectedPackage.quantityLabel}` : null,
      brief: input.brief,
      selections,
    });
    serviceNameForNotifications = service.name;
  } else {
    // Unreachable given the isBundleOrder/category+service checks above —
    // satisfies strict null-checking without weakening either branch.
    return { ok: false, error: "Select a category and service before submitting." };
  }

  const clientName = profile?.full_name ?? "Nimia Client";

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      client_id: client.id,
      service_id: isBundleOrder ? null : service!.dbServiceId,
      full_name: clientName,
      company_name: client.company_name,
      email: user.email ?? "",
      whatsapp: client.whatsapp,
      country: client.country,
      deadline: parseDeadline(input.brief.deadline),
      description,
      reference_link: input.brief.referenceLink.trim() || null,
      status: input.intent === "negotiate" ? "negotiating" : "pending_review",
      proposed_price_usd: estimateTotalPrice,
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

  // Added 4 Agustus 2026 (P0.3 — "file upload order hilang total" dari
  // audit). Files are already safely sitting in Cloudinary by this point
  // (uploaded in useOrderWizard's submit(), before this action was even
  // called) — this just links them to the order that now exists.
  // order_files_insert_own's RLS (0006) allows this because the order was
  // just created by this same authenticated client. A failure here is
  // logged, not surfaced as a failed submission: the order (and the
  // uploaded files themselves) are already safely saved, only the link
  // rows would be missing, which is recoverable manually rather than worth
  // losing an otherwise-successful order over.
  if (input.uploadedFiles.length > 0) {
    const { error: filesError } = await supabase.from("order_files").insert(
      input.uploadedFiles.map((file) => ({
        order_id: order.id,
        file_name: file.name,
        file_url: file.url,
      })),
    );
    if (filesError) {
      console.error("[order_files] Failed to link uploaded files to order", order.id, filesError);
    }
  }

  // Added 4 Agustus 2026 (P0.2 — order confirmation was the biggest
  // "client gets zero notification" gap from the audit). Fire-and-await,
  // not fire-and-forget: Vercel can freeze/kill the function once the
  // response is sent, so we wait for the send attempt to finish before
  // returning. sendOrderReceivedEmail never throws (see lib/email.tsx) —
  // a failed send is logged, not surfaced to the client, since the order
  // itself is already safely saved by this point.
  if (user.email) {
    await sendOrderReceivedEmail(user.email, {
      clientName,
      serviceName: serviceNameForNotifications,
      orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      submittedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
      description,
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.nimiagames.com"}/dashboard/orders`,
    });
  }

  // Added 9 Agustus 2026 (notifications phase, docs/DISCORD.md's Order
  // flow — "website creates the Order → Discord notification to
  // #new-orders"). notifyNewOrder never throws (see
  // packages/discord/src/notify.ts), same fire-and-log posture as
  // sendOrderReceivedEmail right above it.
  const { threadId } = await notifyNewOrder({
    orderId: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
    clientName,
    serviceName: serviceNameForNotifications,
    amountUsd: negotiationAmount ?? estimateTotalPrice,
    isNegotiation: input.intent === "negotiate",
  });

  // Added 9 Agustus 2026 (auto-thread pass, docs/DISCORD.md's "Order
  // thread system"). Persists the thread notifyNewOrder just created so
  // every later negotiation/payment action on this order can post an
  // update into it — goes through set_order_discord_thread_id (0026,
  // SECURITY DEFINER) since orders_update_admin_only blocks a client-side
  // raw UPDATE on `orders` entirely. `threadId` is null when Discord
  // isn't configured or the API call failed — nothing to persist, and no
  // error worth surfacing since the order itself is already safely saved.
  if (threadId) {
    const { error: threadError } = await supabase.rpc("set_order_discord_thread_id", {
      p_order_id: order.id,
      p_thread_id: threadId,
    });
    if (threadError) {
      console.error("[discord] Failed to persist order thread id", order.id, threadError);
    }
  }

  return { ok: true, orderId: order.id };
}
