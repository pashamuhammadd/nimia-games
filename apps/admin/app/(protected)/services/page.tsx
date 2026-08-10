import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { ServicesList, type ServiceRow } from "./ServicesList";

export const metadata = { title: "Services" };

// Real implementation (10 Agustus 2026) — replaces the ComingSoonState
// placeholder. See ServicesList.tsx's own comment for the full context on
// what `services` is and why it's shown split into "Live Catalog" and
// "Legacy" sections.
export default async function ServicesPage() {
  const supabase = createServerClient(await cookies());

  const { data } = await supabase
    .from("services")
    .select("id, name, category, description, base_price, is_active, created_at")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const services: ServiceRow[] = (data as any as ServiceRow[]) ?? [];
  const activeCount = services.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Service Catalog</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          The services catalog stored in the database — used for order records, reporting, and future
          catalog-driven pricing. Pricing shown on the public studio.nimiagames.com/order form is defined
          separately in code today, so toggling a service here does not yet change what clients see live
          there.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Total Services</p>
          <p className="mt-1 text-xl font-bold text-white">{services.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Active</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Inactive</p>
          <p className="mt-1 text-xl font-bold text-white/40">{services.length - activeCount}</p>
        </div>
      </div>

      <ServicesList services={services} />
    </div>
  );
}
