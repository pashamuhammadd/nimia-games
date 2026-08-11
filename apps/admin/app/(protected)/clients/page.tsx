import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { ClientsList, type ClientRow } from "./ClientsList";

export const metadata = { title: "Clients" };

// Real implementation (10 Agustus 2026) — replaces the ComingSoonState
// placeholder. `clients` has no email column (only auth.users does, which
// isn't reachable through this client — same gap CreateVoucherForm.tsx's
// own comment already flags for the Vouchers "Assign to" dropdown), so
// contact email/whatsapp/country fall back to the client's most recent
// order whenever the `clients` row itself was left blank at signup
// (company_name/whatsapp/country are all optional there — see
// packages/db/migrations/0002_catalog_and_clients.sql).
//
// Aggregation (orders count, total paid, order history) is done here in
// JS rather than with a DB view/RPC — deliberately, to stay within this
// pass's "no new migration" scope. Revisit with a real aggregate view if
// the client list ever grows large enough for this to matter.
export default async function ClientsPage() {
  const supabase = createServerClient(await cookies());

  const [{ data: clients }, { data: orders }] = await Promise.all([
    // avatar_url added 11 Agustus 2026 (parity fix — this list used to
    // always render two-letter initials, never the client's real photo;
    // see ClientsList.tsx's ClientThumbnail).
    supabase
      .from("clients")
      .select("id, company_name, whatsapp, country, created_at, users(full_name, avatar_url)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select(
        "client_id, full_name, company_name, email, whatsapp, country, status, final_price_usd, created_at, services(name)",
      )
      .order("created_at", { ascending: false }),
  ]);

  const ordersByClient = new Map<string, any[]>();
  for (const order of orders ?? []) {
    const list = ordersByClient.get(order.client_id) ?? [];
    list.push(order);
    ordersByClient.set(order.client_id, list);
  }

  const clientRows: ClientRow[] = (clients ?? []).map((c: any) => {
    const clientOrders = ordersByClient.get(c.id) ?? [];
    // orders was fetched newest-first, so index 0 is the latest.
    const latestOrder = clientOrders[0] ?? null;
    const paidOrders = clientOrders.filter((o) => o.status === "paid");
    const totalPaidUsd = paidOrders.reduce((sum, o) => sum + Number(o.final_price_usd ?? 0), 0);
    const usersRow = Array.isArray(c.users) ? c.users[0] : c.users;

    return {
      id: c.id,
      name:
        c.company_name ||
        usersRow?.full_name ||
        latestOrder?.company_name ||
        latestOrder?.full_name ||
        "Unnamed client",
      avatarUrl: usersRow?.avatar_url ?? null,
      email: latestOrder?.email ?? null,
      whatsapp: c.whatsapp || latestOrder?.whatsapp || null,
      country: c.country || latestOrder?.country || null,
      joinedAt: c.created_at,
      ordersCount: clientOrders.length,
      paidOrdersCount: paidOrders.length,
      totalPaidUsd,
      orders: clientOrders.map((o: any) => {
        const service = Array.isArray(o.services) ? o.services[0] : o.services;
        return {
          serviceName: service?.name ?? "Custom Project",
          status: o.status,
          finalPriceUsd: o.final_price_usd,
          createdAt: o.created_at,
        };
      }),
    };
  });

  const totalRevenue = clientRows.reduce((sum, c) => sum + c.totalPaidUsd, 0);
  const repeatClients = clientRows.filter((c) => c.ordersCount > 1).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Directory</h1>
        <p className="mt-1 text-sm text-white/45">
          Every client who has signed up, with their contact info and full order history.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Total Clients</p>
          <p className="mt-1 text-xl font-bold text-white">{clientRows.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Repeat Clients</p>
          <p className="mt-1 text-xl font-bold text-white">{repeatClients}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Total Revenue</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">${totalRevenue.toLocaleString("en-US")}</p>
        </div>
      </div>

      <ClientsList clients={clientRows} />
    </div>
  );
}
