import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "./components/TelegramLinkGate";
import { orderStatusMeta } from "./lib/statusLabels";
import { portfolioUrl } from "./lib/links";

interface RecentOrder {
  id: string;
  status: string;
  services: { name: string } | { name: string }[] | null;
}

// Redesigned AGAIN 20 Agustus 2026, per Pasha's follow-up feedback: the
// first redesign (order-count/partner-balance stat-grid -> hero-card +
// feature-strip) still read as "a dashboard with a banner on top" to
// him, not a hero section. This version leans all the way into "hero
// section, not a dashboard, dinamis":
//   - The hero card is now the whole pitch (a hook headline + one line on
//     what Nimia Studio actually makes), not a status readout, and it has
//     a slow-panning animated gradient (see globals.css's
//     heroGradientPan) instead of a flat fill.
//   - Right under it, a trust-grid of 4 tiles answers "why Nimia Studio"
//     before a first-time client has tapped anything: flexible/
//     negotiable pricing, 100% human support, a professional team, and an
//     official invoice - the exact four things Pasha asked to surface.
//   - "Your latest order" is still here for a returning client, but it's
//     now the LAST thing on the page (after the pitch), not the first.
//   - globals.css's `.page > *` staggered fade-in-and-up is what makes
//     the whole page feel alive on open rather than a static brochure
//     image - every section below arrives in sequence, not all at once.
// Still a Server Component with one real Supabase read (recent order) -
// this is a hook page, not a marketing site export, so it should always
// reflect the client's actual account.
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

  // Plain call, cast with `as` after the await - see
  // app/services/page.tsx's own comment on why a generic-typed call
  // (`.returns<T>()`) breaks under this project's still-placeholder
  // Database type.
  const { data: recentOrdersData } = client
    ? await supabase
        .from("orders")
        .select("id, status, services(name)")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: null };
  const recentOrders = recentOrdersData as RecentOrder[] | null;
  const recentOrder = recentOrders?.[0];
  const recentOrderServiceName = recentOrder
    ? Array.isArray(recentOrder.services)
      ? recentOrder.services[0]?.name
      : recentOrder.services?.name
    : null;

  return (
    <div className="page">
      <div className="hero-card">
        <p className="hero-eyebrow">Nimia Studio</p>
        <h1 className="hero-title">Hi {firstName}, let&apos;s bring your idea to life 🎬</h1>
        <p className="hero-tagline">
          2D animation for Web3 communities: meme animation, crypto GIFs, and custom builds. Flexible pricing,
          negotiated with a real human, until you&apos;re happy.
        </p>
        <div className="hero-actions">
          <a className="cta-button" href="/services">
            🚀 Start a Project
          </a>
          <a className="cta-button secondary" href={portfolioUrl()} target="_blank" rel="noreferrer">
            🎨 Portfolio
          </a>
        </div>
      </div>

      <p className="section-title">Why Nimia Studio</p>
      <div className="trust-grid">
        <div className="trust-item">
          <span className="icon">💸</span>
          <p className="title">Flexible Pricing</p>
          <p className="desc">Nothing is fixed — we negotiate together until you&apos;re happy with the price.</p>
        </div>
        <div className="trust-item">
          <span className="icon">🧑‍💻</span>
          <p className="title">100% Human Support</p>
          <p className="desc">Real people guide you from brief to delivery, never a bot.</p>
        </div>
        <div className="trust-item">
          <span className="icon">🏆</span>
          <p className="title">Professional Team</p>
          <p className="desc">Experienced animators and developers on every project.</p>
        </div>
        <div className="trust-item">
          <span className="icon">🧾</span>
          <p className="title">Official Invoice</p>
          <p className="desc">Every paid order comes with a proper receipt and invoice.</p>
        </div>
      </div>

      <div className="feature-strip">
        <a className="feature-pill" href="/services">
          🎭 Meme Animation
        </a>
        <a className="feature-pill" href="/services">
          ✨ Crypto GIFs
        </a>
        <a className="feature-pill" href="/services">
          🎬 Custom Builds
        </a>
      </div>

      {recentOrder && (
        <div className="card">
          <p className="section-title" style={{ marginTop: 0 }}>
            Your latest order
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
        <a className="chip" href="/orders">
          📦 My Orders
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
