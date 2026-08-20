import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { serviceCategoryLabel } from "../lib/statusLabels";
import { orderWizardUrl, portfolioUrl } from "../lib/links";

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price: number | null;
}

// Phase 2 (docs/TELEGRAM.md's roadmap, 20 Agustus 2026): a real, read-only
// catalog straight from public.services (same table + RLS policy every
// other app in this monorepo reads - "services_public_read_active",
// packages/db/migrations/0006_rls_policies.sql). "Request this service"
// intentionally opens the real Order Configurator (apps/app/app/order,
// a multi-step wizard) in the client's own browser instead of a second
// order form living here - see app/lib/links.ts's own comment for why.
export default async function ServicesPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <TelegramLinkGate />;

  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, description, base_price")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .returns<ServiceRow[]>();

  const grouped = groupByCategory(services ?? []);

  return (
    <div className="page">
      <h1 className="greeting">🛒 Services</h1>
      <p className="subtitle">Browse what Nimia Studio offers. Tap a service to configure and price your project.</p>

      <a className="cta-button" href={orderWizardUrl()} target="_blank" rel="noreferrer">
        🚀 Start a Project
      </a>

      <a className="link-row" href={portfolioUrl()} target="_blank" rel="noreferrer">
        <span>🎨 See our portfolio first</span>
        <span className="arrow">↗</span>
      </a>

      {grouped.length === 0 && (
        <div className="card">
          <p className="empty-state" style={{ padding: 0 }}>
            No services are published yet. Check back soon, or tap Start a Project to describe what you need
            directly.
          </p>
        </div>
      )}

      {grouped.map(([category, items]) => (
        <div key={category} className="card">
          <p className="section-title" style={{ marginTop: 0 }}>
            {serviceCategoryLabel(category)}
          </p>
          {items.map((service, index) => (
            <div key={service.id} className="list-row" style={index === 0 ? { borderTop: "none", paddingTop: 4 } : undefined}>
              <div className="list-row-header">
                <p className="list-row-title">{service.name}</p>
                {service.base_price != null && (
                  <span className="status-badge">From ${formatPrice(service.base_price)}</span>
                )}
              </div>
              {service.description && <p className="list-row-meta">{service.description}</p>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByCategory(services: ServiceRow[]): [string, ServiceRow[]][] {
  const map = new Map<string, ServiceRow[]>();
  for (const service of services) {
    const bucket = map.get(service.category);
    if (bucket) bucket.push(service);
    else map.set(service.category, [service]);
  }
  return Array.from(map.entries());
}

// USD is assumed throughout (matches partner_rewards.amount_usd and the
// rest of this schema's money columns) - there is no per-service currency
// column as of packages/db/migrations/0002_catalog_and_clients.sql.
function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
