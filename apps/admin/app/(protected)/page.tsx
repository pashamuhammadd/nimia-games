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
    { count: unpaidInvoicesCount },
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
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["unpaid", "partially_paid", "overdue"]),
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
    tone:
      u.to_status === "completed" || u.to_status === "paid"
        ? "success"
        : u.to_status === "waiting_payment"
          ? "payment"
          : u.to_status === "revision" || u.to_status === "final_review"
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
          label="Unpaid Invoices"
          value={unpaidInvoicesCount ?? 0}
          href="/invoices"
          footerLabel="View all invoices"
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
