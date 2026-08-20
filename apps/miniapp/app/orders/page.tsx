import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { orderStatusMeta } from "../lib/statusLabels";
import { dashboardOrdersUrl, orderWizardUrl } from "../lib/links";

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  description: string;
  services: { name: string } | { name: string }[] | null;
}

// Phase 2 (docs/TELEGRAM.md's roadmap, 20 Agustus 2026): a real, read-only
// list of the client's own orders (RLS-scoped via
// "orders_select_own_or_admin", packages/db/migrations/0006_rls_policies.sql
// - is_owner_client(client_id), so this query can only ever return this
// user's own rows even without an extra .eq filter, same guarantee every
// other app in this monorepo relies on). Each row now links to
// /orders/[orderId] (added 20 Agustus 2026, per Pasha's "harus ada fitur
// negosiasi juga" request) - the detail page shows the negotiation
// thread for orders that have one. Payment proof and installment
// schedules still stay on the full dashboard - see app/lib/links.ts's
// own comment for why those aren't reimplemented here.
export default async function OrdersPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <TelegramLinkGate />;

  const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();

  // Plain call, cast with `as` after the await - see services/page.tsx's
  // own comment on why `.returns<T>()` breaks under this project's still-
  // placeholder Database type.
  const { data: ordersData } = client
    ? await supabase
        .from("orders")
        .select("id, status, created_at, description, services(name)")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: null };
  const orders = ordersData as OrderRow[] | null;

  return (
    <div className="page">
      <h1 className="greeting">📦 My Orders</h1>
      <p className="subtitle">Your most recent orders. Tap one to see status and respond to price negotiation.</p>

      {!orders?.length ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "24px 0" }}>
            <p style={{ margin: "0 0 16px" }}>You haven&apos;t placed an order yet.</p>
            <a className="cta-button" href={orderWizardUrl()} target="_blank" rel="noreferrer">
              🚀 Start a Project
            </a>
          </div>
        </div>
      ) : (
        <div className="card">
          {orders.map((order, index) => {
            const meta = orderStatusMeta(order.status);
            const serviceName = Array.isArray(order.services) ? order.services[0]?.name : order.services?.name;
            const needsAttention = order.status === "negotiating";
            return (
              <a
                key={order.id}
                href={`/orders/${order.id}`}
                className="list-row"
                style={{
                  ...(index === 0 ? { borderTop: "none", paddingTop: 4 } : {}),
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="list-row-header">
                  <p className="list-row-title">{serviceName ?? "Custom Project"}</p>
                  <span className="status-badge">
                    <span className="dot" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>
                <p className="list-row-meta">{formatDate(order.created_at)}</p>
                <p className="list-row-meta" style={{ color: "var(--text)" }}>
                  {truncate(order.description, 110)}
                </p>
                {needsAttention && (
                  <p className="list-row-meta" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    💬 In price negotiation, tap to view
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}

      <a className="link-row" href={dashboardOrdersUrl()} target="_blank" rel="noreferrer">
        <span>Full details in Nimia Studio</span>
        <span className="arrow">↗</span>
      </a>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
}
