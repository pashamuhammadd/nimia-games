import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { renderOrderReceiptPdf } from "@nimia/pdf";

// @react-pdf/renderer needs real Node APIs — must run in the Node.js
// runtime, not Edge (Next.js App Router route segment config).
export const runtime = "nodejs";

// Buyer-facing PDF receipt download (4 Agustus 2026, P1 item #6 — Invoice/
// PDF generation). GET /api/orders/[id]/receipt.
//
// Authorization is NOT re-derived in this file — the `orders` SELECT below
// is already gated by RLS (a client only ever sees their own rows), and
// get_or_create_order_receipt() (packages/db/migrations/0024_order_receipts.sql)
// re-checks ownership/admin AND status='paid' itself before returning
// anything. Same "RLS/RPC is the real boundary, this file is just
// convenience" convention as every other money-related action in this app.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await context.params;
  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, full_name, company_name, email, final_price_usd, payment_network, payment_token, payment_tx_hash, payment_verified_at, services(name)",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return new Response("Order not found.", { status: 404 });
  }

  const { data: receiptRows, error: receiptError } = await supabase.rpc("get_or_create_order_receipt", {
    p_order_id: orderId,
  });
  if (receiptError) {
    return new Response(receiptError.message, { status: 403 });
  }
  const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
  if (!receipt) {
    return new Response("Receipt not available for this order.", { status: 404 });
  }

  const service = Array.isArray((order as any).services) ? (order as any).services[0] : (order as any).services;

  const pdfBuffer = await renderOrderReceiptPdf({
    receiptNumber: receipt.receipt_number,
    issuedAt: receipt.created_at,
    billedToName: (order as any).company_name || (order as any).full_name,
    billedToEmail: (order as any).email,
    serviceName: service?.name ?? "Custom Project",
    amountUsd: Number((order as any).final_price_usd ?? 0),
    network: (order as any).payment_network,
    currency: (order as any).payment_token,
    txHash: (order as any).payment_tx_hash,
    verifiedAt: (order as any).payment_verified_at,
    orderId: (order as any).id,
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
