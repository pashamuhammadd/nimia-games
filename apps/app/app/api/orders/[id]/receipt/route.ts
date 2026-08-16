import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { renderOrderReceiptPdf } from "@nimia/pdf";

// @react-pdf/renderer needs real Node APIs — must run in the Node.js
// runtime, not Edge (Next.js App Router route segment config).
export const runtime = "nodejs";

// Buyer-facing PDF receipt download (4 Agustus 2026, P1 item #6 — Invoice/
// PDF generation). GET /api/orders/[id]/receipt[?installment=<uuid>].
//
// Authorization is NOT re-derived in this file — the `orders` SELECT below
// is already gated by RLS (a client only ever sees their own rows), and
// get_or_create_order_receipt() (packages/db/migrations/
// 0044_invoice_architecture_cleanup.sql) re-checks ownership/admin itself
// before returning anything (a legacy order additionally requires
// status='paid'; an installment additionally requires that specific row's
// status='paid'). Same "RLS/RPC is the real boundary, this file is just
// convenience" convention as every other money-related action in this app.
//
// ?installment= (16 Agustus 2026, Fase 2 Invoice Architecture) — which
// order_installments row this receipt is for. Omitted entirely for a
// single-payment order (full_payment or legacy pre-installments) — the RPC
// auto-resolves to the one row/receipt that exists. Required once an order
// has more than one installment (the RPC raises if it's ambiguous), which
// is why InstallmentSchedule.tsx's per-milestone "Download Receipt" link
// always passes it explicitly rather than relying on auto-resolve.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await context.params;
  const installmentId = new URL(request.url).searchParams.get("installment");
  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, full_name, company_name, email, payment_network, payment_token, payment_tx_hash, payment_verified_at, services(name), package_name",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return new Response("Order not found.", { status: 404 });
  }

  const { data: receiptRows, error: receiptError } = await supabase.rpc("get_or_create_order_receipt", {
    p_order_id: orderId,
    p_installment_id: installmentId,
  });
  if (receiptError) {
    return new Response(receiptError.message, { status: 403 });
  }
  const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
  if (!receipt) {
    return new Response("Receipt not available for this order.", { status: 404 });
  }

  const service = Array.isArray((order as any).services) ? (order as any).services[0] : (order as any).services;

  // Payment method fields (network/token/tx hash/verified date) come from
  // the SPECIFIC installment row when this receipt is for one — each
  // installment has its own payment_network/payment_token/payment_tx_hash/
  // payment_verified_at (0038_custom_order_installments.sql), which can
  // legitimately differ payment-to-payment (a client paying installment #2
  // from a different wallet than installment #1, for instance). Falls back
  // to the order-level columns only for the legacy (no installment_id) path,
  // same fields this route always read before this migration.
  let paymentNetwork = (order as any).payment_network as string | null;
  let paymentToken = (order as any).payment_token as string | null;
  let paymentTxHash = (order as any).payment_tx_hash as string | null;
  let paymentVerifiedAt = (order as any).payment_verified_at as string | null;

  if (receipt.installment_id) {
    const { data: installment } = await supabase
      .from("order_installments")
      .select("payment_network, payment_token, payment_tx_hash, payment_verified_at")
      .eq("id", receipt.installment_id)
      .single();
    if (installment) {
      paymentNetwork = installment.payment_network;
      paymentToken = installment.payment_token;
      paymentTxHash = installment.payment_tx_hash;
      paymentVerifiedAt = installment.payment_verified_at;
    }
  }

  const pdfBuffer = await renderOrderReceiptPdf({
    receiptNumber: receipt.receipt_number,
    issuedAt: receipt.created_at,
    billedToName: (order as any).company_name || (order as any).full_name,
    billedToEmail: (order as any).email,
    // package_name (12 Agustus 2026, order-flow audit fix — see
    // packages/db/migrations/0036_order_package_name.sql) covers a
    // Package/Bundle order, which has service_id/services null instead of
    // a service row — without this fallback every bundle-order receipt
    // read "Custom Project" instead of the package actually purchased.
    serviceName: service?.name ?? (order as any).package_name ?? "Custom Project",
    amountUsd: Number(receipt.amount_usd ?? 0),
    network: paymentNetwork,
    currency: paymentToken,
    txHash: paymentTxHash,
    verifiedAt: paymentVerifiedAt,
    orderId: (order as any).id,
    installmentLabel: receipt.installment_label ?? null,
    projectTotalUsd: Number(receipt.project_total_usd ?? 0),
    paidAmountUsd: Number(receipt.paid_amount_usd ?? 0),
    remainingBalanceUsd: Number(receipt.remaining_amount_usd ?? 0),
  });

  // Response()'s TS types want a plain Uint8Array/ArrayBufferView, not a
  // Node Buffer subclass directly — Next.js's build-time typecheck (with the
  // DOM lib's BodyInit) rejects `Buffer<ArrayBufferLike>` even though it's a
  // Uint8Array at runtime. Wrap it (no copy — same underlying bytes) so this
  // satisfies BodyInit under a strict Next.js/TS build.
  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receipt_number}.pdf"`,
    },
  });
}
