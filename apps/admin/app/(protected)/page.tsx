import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { GreetingHeader } from "../components/dashboard/GreetingHeader";
import { StatCard } from "../components/dashboard/StatCard";
import { PendingOrdersSection, type PendingOrderItem } from "../components/dashboard/PendingOrdersSection";
import { RecentActivityTimeline, type ActivityItem } from "../components/dashboard/RecentActivityTimeline";
import { projectActivityLabel } from "../lib/projectStatus";
import { formatRelativeTime } from "../lib/relativeTime";

export const metadata = { title: "Overview" };

const ORDERS_HREF = "/orders";
const PENDING_ORDERS_HREF = "/orders?status=pending_review";
// Fix (10 Agustus 2026, while building the real Invoices page): this used
// to count public.invoices, which is dead code — nothing has written to
// that table since the crypto-payment flow (0013) replaced the old
// IDR/manual invoice flow it belonged to (see 0024_order_receipts.sql's own
// comment on the same trio). That query was always going to read ~0
// regardless of real activity, which would have been a misleading stat
// sitting right next to the new, real Invoices page. "Awaiting Payment"
// counts orders actually waiting on money (quoted-but-unpaid +
// submitted-but-unverified) instead, and links to the equivalent Orders
// filter rather than to /invoices (which now only lists orders already
// paid).
const AWAITING_PAYMENT_HREF = "/orders?status=awaiting_payment";

export default async function OverviewPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user!.id)
    .single();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";

  // Every query below reads across ALL clients — this is the whole point
  // of the admin app, and is safe because RLS (0006_rls_policies.sql) only
  // allows it for a row in public.users with role = 'admin', which is
  // exactly who can reach this page (see (protected)/layout.tsx).
  const [
    { count: clientsCount },
    { count: pendingOrdersCount },
    { count: activeProjectsCount },
    { count: awaitingPaymentCount },
    { data: pendingOrders },
    { data: updates },
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(completed,cancelled)"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["awaiting_payment", "payment_submitted"]),
    supabase
      .from("orders")
      .select("id, full_name, company_name, budget, created_at, services(name), clients(company_name)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("project_updates")
      .select("id, to_status, created_at, projects(title)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const pendingOrderItems: PendingOrderItem[] = (pendingOrders ?? []).map((o: any) => ({
    id: o.id,
    title: o.services?.name ?? "Custom Project",
    clientLabel: o.clients?.company_name || o.company_name || o.full_name,
    budget: o.budget,
    submittedLabel: formatRelativeTime(o.created_at),
  }));

  const recentActivity: ActivityItem[] = (updates ?? []).map((u: any) => ({
    id: u.id,
    title: projectActivityLabel(u.to_status),
    subtitle: u.projects?.title ?? "Project",
    timeLabel: formatRelativeTime(u.created_at),
    // project_status simplified 10->7 (16 Agustus 2026,
    // 0045_project_status_simplify.sql, State Architecture) — 'paid' is
    // now 'approved' and 'final_review' is now 'ready_for_delivery'. The
    // old 'waiting_payment' tone branch is dropped: that value was already
    // dead (nothing ever wrote it, see the migration's own comment) and
    // doesn't exist in the new enum at all.
    tone:
      u.to_status === "completed" || u.to_status === "approved"
        ? "success"
        : u.to_status === "revision" || u.to_status === "ready_for_delivery"
          ? "upload"
          : u.to_status === "cancelled"
            ? "cancelled"
            : "neutral",
  }));

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader name={firstName} ctaHref={PENDING_ORDERS_HREF} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          index={0}
          icon="users"
          label="Total Clients"
          value={clientsCount ?? 0}
          href="/clients"
          footerLabel="View all clients"
          accent="crimson"
        />
        <StatCard
          index={1}
          icon="inbox"
          label="Pending Orders"
          value={pendingOrdersCount ?? 0}
          href={PENDING_ORDERS_HREF}
          footerLabel="Review orders"
          accent="amber"
        />
        <StatCard
          index={2}
          icon="layers"
          label="Active Projects"
          value={activeProjectsCount ?? 0}
          href="/projects"
          footerLabel="View all projects"
          accent="purple"
        />
        <StatCard
          index={3}
          icon="receipt"
          label="Awaiting Payment"
          value={awaitingPaymentCount ?? 0}
          href={AWAITING_PAYMENT_HREF}
          footerLabel="View orders"
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PendingOrdersSection orders={pendingOrderItems} viewAllHref={PENDING_ORDERS_HREF} />
        </div>
        <RecentActivityTimeline activities={recentActivity} viewAllHref={ORDERS_HREF} />
      </div>
    </div>
  );
}
