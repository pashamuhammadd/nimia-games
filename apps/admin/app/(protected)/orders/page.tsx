import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { OrdersList } from "./OrdersList";
import { ORDER_STATUS_FILTERS } from "../../lib/orderStatus";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = createServerClient(await cookies());

  let query = supabase
    .from("orders")
    .select(
      // proposed_price_usd/final_price_usd + the order_negotiations embed
      // (3 Agustus 2026, per user request — "kok gaada list yang nego
      // sih") let OrderDetailPanel show the actual offer thread for a
      // negotiating order, same data shape as
      // apps/studio/app/dashboard/negotiations/page.tsx already reads.
      "id, full_name, company_name, email, whatsapp, country, budget, deadline, description, reference_link, status, proposed_price_usd, final_price_usd, created_at, services(name), clients(company_name), order_files(id, file_name, file_url), order_negotiations(id, proposed_by, amount_usd, message, created_at)",
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: orders } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-white/45">
          Review incoming orders, send quotations, and convert approved ones into projects.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_FILTERS.map((filter) => {
          const isActive = (status ?? "all") === filter.value;
          const href = filter.value === "all" ? "/orders" : `/orders?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-[var(--nimia-crimson)]/15 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
                  : "rounded-full px-4 py-1.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <OrdersList orders={(orders as any) ?? []} />
    </div>
  );
}
