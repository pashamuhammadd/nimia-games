import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "./components/TelegramLinkGate";
import { orderStatusMeta } from "./lib/statusLabels";
import { orderWizardUrl } from "./lib/links";

interface RecentOrder {
  id: string;
  status: string;
  services: { name: string } | { name: string }[] | null;
}

export default async function HomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <TelegramLinkGate />;
  }

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  // Home is a lightweight summary, not a duplicate of the Orders/Partner
  // tabs' own full queries (docs/TELEGRAM.md's roadmap, 20 Agustus 2026):
  // one order count, the single most recent order, and the partner's
  // available balance - enough to be worth opening, without re-fetching
  // everything those tabs already show in full.
  // Plain calls, cast with `as` after the await - see
  // app/services/page.tsx's own comment on why a generic-typed call
  // (`.returns<T>()`) breaks under this project's still-placeholder
  // Database type.
  const [{ count: orderCount }, { data: recentOrdersData }, { data: partner }] = await Promise.all([
    client
      ? supabase.from("orders").select("id", { count: "exact", head: true }).eq("client_id", client.id)
      : Promise.resolve({ count: 0 }),
    client
      ? supabase
          .from("orders")
          .select("id, status, services(name)")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
    supabase.from("partners").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  const recentOrders = recentOrdersData as RecentOrder[] | null;

  const { data: metricsData } = partner
    ? await supabase.rpc("get_partner_metrics", { p_partner_id: partner.id })
    : { data: null };
  const metricsRows = metricsData as { available_reward_usd: number }[] | null;
  const availableReward = metricsRows?.[0]?.available_reward_usd ?? 0;
  const recentOrder = recentOrders?.[0];
  const recentOrderServiceName = recentOrder
    ? Array.isArray(recentOrder.services)
      ? recentOrder.services[0]?.name
      : recentOrder.services?.name
    : null;

  return (
    <div className="page">
      <h1 className="greeting">Welcome back, {firstName} 👋</h1>
      <p className="subtitle">Your Telegram account is connected to Nimia Studio.</p>

      <a className="cta-button" href={orderWizardUrl()} target="_blank" rel="noreferrer">
        🚀 Start a Project
      </a>

      <div className="stat-grid">
        <a href="/orders" className="stat-card" style={{ textDecoration: "none" }}>
          <p className="value">{orderCount ?? 0}</p>
          <p className="label">Total orders</p>
        </a>
        <a href="/partner" className="stat-card" style={{ textDecoration: "none" }}>
          <p className="value">${Number(availableReward).toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
          <p className="label">Partner balance</p>
        </a>
      </div>

      {recentOrder && (
        <div className="card">
          <p className="section-title" style={{ marginTop: 0 }}>
            Latest order
          </p>
          <div className="list-row" style={{ borderTop: "none", paddingTop: 4 }}>
            <div className="list-row-header">
              <p className="list-row-title">{recentOrderServiceName ?? "Custom Project"}</p>
              <span className="status-badge">
                <span className="dot" style={{ background: orderStatusMeta(recentOrder.status).color }} />
                {orderStatusMeta(recentOrder.status).label}
              </span>
            </div>
          </div>
          <a className="link-row" href="/orders" style={{ marginTop: 4 }}>
            <span>View all orders</span>
            <span className="arrow">→</span>
          </a>
        </div>
      )}

      <div className="chip-row">
        <a className="chip" href="/services">
          🛒 Browse Services
        </a>
        <a className="chip" href="/partner">
          🤝 Partner Program
        </a>
        <a className="chip" href="/account">
          👤 Account
        </a>
      </div>
    </div>
  );
}
