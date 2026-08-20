import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../../components/TelegramLinkGate";
import { orderStatusMeta } from "../../lib/statusLabels";
import { dashboardOrdersUrl } from "../../lib/links";
import { NegotiationPanel } from "./NegotiationPanel";

interface OrderDetailRow {
  id: string;
  status: string;
  created_at: string;
  description: string;
  final_price_usd: number | null;
  services: { name: string } | { name: string }[] | null;
}

interface NegotiationOfferRow {
  id: string;
  proposed_by: string;
  amount_usd: number;
  message: string | null;
  created_at: string;
}

// New, 20 Agustus 2026 (per Pasha's "harus ada fitur negosiasi juga di
// miniapp" request). Shows one order's status + description, and, when
// there's at least one row in order_negotiations for it, the same
// accept/reject/counter-offer flow apps/app/app/dashboard/negotiations
// gives a client - see NegotiationPanel.tsx and this folder's actions.ts
// for the RPCs this reuses. Payment proof upload and installment
// schedules are NOT reimplemented here (see app/lib/links.ts's own
// comment on that strategy) - the "Full details" link at the bottom
// covers those.
export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <TelegramLinkGate />;

  const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
  if (!client) notFound();

  // Belt-and-suspenders .eq("client_id", ...) alongside RLS
  // (orders_select_own_or_admin), same convention as every other read in
  // this app - see orders/page.tsx's own comment.
  const { data: orderData } = await supabase
    .from("orders")
    .select("id, status, created_at, description, final_price_usd, services(name)")
    .eq("id", orderId)
    .eq("client_id", client!.id)
    .maybeSingle();
  const order = orderData as OrderDetailRow | null;
  if (!order) notFound();

  const { data: offersData } = await supabase
    .from("order_negotiations")
    .select("id, proposed_by, amount_usd, message, created_at")
    .eq("order_id", order!.id)
    .order("created_at", { ascending: true });
  const offers = (offersData as NegotiationOfferRow[] | null) ?? [];

  const meta = orderStatusMeta(order!.status);
  const serviceName = Array.isArray(order!.services) ? order!.services[0]?.name : order!.services?.name;

  return (
    <div className="page">
      <a className="back-link" href="/orders">
        ‹ Back to Orders
      </a>
      <h1 className="greeting">{serviceName ?? "Custom Project"}</h1>
      <span className="status-badge" style={{ alignSelf: "flex-start" }}>
        <span className="dot" style={{ background: meta.color }} />
        {meta.label}
      </span>

      <div className="card">
        <p className="section-title" style={{ marginTop: 0 }}>
          Project details
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text)" }}>{order!.description}</p>
        <p className="list-row-meta" style={{ marginTop: 8 }}>Submitted {formatDate(order!.created_at)}</p>
      </div>

      {offers.length > 0 && (
        <NegotiationPanel
          orderId={order!.id}
          status={order!.status}
          finalPriceUsd={order!.final_price_usd}
          offers={offers}
        />
      )}

      <a className="link-row" href={dashboardOrdersUrl()} target="_blank" rel="noreferrer">
        <span>Full details, payment &amp; delivery in Nimia Studio</span>
        <span className="arrow">↗</span>
      </a>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
