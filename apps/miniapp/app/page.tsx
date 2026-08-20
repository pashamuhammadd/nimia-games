import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "./components/TelegramLinkGate";
import { orderStatusMeta } from "./lib/statusLabels";
import { orderWizardUrl, portfolioUrl } from "./lib/links";

interface RecentOrder {
  id: string;
  status: string;
  services: { name: string } | { name: string }[] | null;
}

// Redesigned 20 Agustus 2026 per Pasha's feedback: the previous version
// (order count + partner balance stat-grid) read as a Partner dashboard,
// not a front door to the studio. This version leads with a brand
// moment (who Nimia Studio is, in one line) and the two things a client
// actually opens Home to do (start a project, check their latest order),
// and drops the partner metric entirely - that number already lives on
// the Partner tab, showing it twice added nothing but "dashboard" noise
// here. Deliberately still a Server Component with one real Supabase
// read (recent order), not a static marketing page - it should feel
// alive, not like a brochure.
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
        <h1 className="hero-title">Welcome back, {firstName} 👋</h1>
        <p className="hero-tagline">
          A creative &amp; development studio for Web3 communities. Meme animation, crypto GIFs, and custom
          builds, made fast and made to be shared.
        </p>
        <div className="hero-actions">
          <a className="cta-button" href={orderWizardUrl()} target="_blank" rel="noreferrer">
            🚀 Start a Project
          </a>
          <a className="cta-button secondary" href={portfolioUrl()} target="_blank" rel="noreferrer">
            🎨 Portfolio
          </a>
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
