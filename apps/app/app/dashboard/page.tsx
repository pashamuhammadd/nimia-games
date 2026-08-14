import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { GreetingHeader } from "../components/dashboard/GreetingHeader";
import { StatCard } from "../components/dashboard/StatCard";
import { ActiveOrdersSection, type ActiveOrderItem } from "../components/dashboard/ActiveOrdersSection";
import { RecentActivityTimeline, type ActivityItem } from "../components/dashboard/RecentActivityTimeline";
import { EmptyDashboardState } from "../components/dashboard/EmptyDashboardState";
import { projectStatusMeta, projectActivityLabel } from "../lib/projectStatus";
import { formatRelativeTime } from "../lib/relativeTime";

export const metadata = { title: "Dashboard" };

// Points at /order, the Project Configurator (3 Agustus 2026, per user
// request — was "/dashboard/orders", the old generic order form; that page
// itself was rewritten the same day to list existing orders instead of a
// submission form, so it's no longer where a NEW project should start).
const START_PROJECT_HREF = "/order";
const PROJECTS_HREF = "/dashboard/projects";
const VOUCHERS_HREF = "/dashboard/vouchers";

export default async function DashboardOverviewPage() {
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

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  let hasAnyEngagement = false;
  let activeOrdersCount = 0;
  let negotiationsCount = 0;
  let pendingPaymentCount = 0;
  let activeOrders: ActiveOrderItem[] = [];
  let recentActivity: ActivityItem[] = [];

  if (client) {
    const [{ count: ordersEverCount }, { data: projects }, { count: negotiationCount }, { count: paymentCount }] =
      await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("client_id", client.id),
        supabase
          .from("projects")
          .select("id, title, status, progress, updated_at")
          .eq("client_id", client.id)
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("status", "quotation_sent"),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("client_id", client.id)
          .in("status", ["unpaid", "partially_paid", "overdue"]),
      ]);

    const allProjects = projects ?? [];
    hasAnyEngagement = (ordersEverCount ?? 0) > 0 || allProjects.length > 0;
    negotiationsCount = negotiationCount ?? 0;
    pendingPaymentCount = paymentCount ?? 0;
    activeOrdersCount = allProjects.filter((p) => !["completed", "cancelled"].includes(p.status)).length;

    activeOrders = allProjects.slice(0, 3).map((p) => {
      const meta = projectStatusMeta(p.status);
      return {
        id: p.id,
        title: p.title,
        statusLabel: meta.label,
        dotClass: meta.dotClass,
        progress: p.progress,
        updatedLabel: formatRelativeTime(p.updated_at),
      };
    });

    if (allProjects.length > 0) {
      const idToTitle = new Map(allProjects.map((p) => [p.id, p.title]));
      const { data: updates } = await supabase
        .from("project_updates")
        .select("id, project_id, to_status, created_at")
        .in("project_id", allProjects.map((p) => p.id))
        .order("created_at", { ascending: false })
        .limit(4);

      recentActivity = (updates ?? []).map((u) => ({
        id: u.id,
        title: projectActivityLabel(u.to_status),
        subtitle: idToTitle.get(u.project_id) ?? "Project",
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
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader name={firstName} ctaHref={START_PROJECT_HREF} />

      {hasAnyEngagement ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              index={0}
              icon="package"
              label="Active Orders"
              value={activeOrdersCount}
              href={PROJECTS_HREF}
              footerLabel="View all orders"
              accent="crimson"
            />
            <StatCard
              index={1}
              icon="handshake"
              label="Pending Negotiations"
              value={negotiationsCount}
              href="/dashboard/negotiations"
              footerLabel="View all negotiations"
              accent="amber"
            />
            <StatCard
              index={2}
              icon="wallet"
              label="Pending Payment"
              value={pendingPaymentCount}
              href="/dashboard/invoices"
              footerLabel="View all invoices"
              accent="purple"
            />
            <StatCard
              index={3}
              icon="ticket"
              label="Available Voucher"
              value={0}
              href={VOUCHERS_HREF}
              footerLabel="View all vouchers"
              accent="emerald"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActiveOrdersSection
                orders={activeOrders}
                viewAllHref={PROJECTS_HREF}
                detailHref={PROJECTS_HREF}
              />
            </div>
            <RecentActivityTimeline activities={recentActivity} viewAllHref={PROJECTS_HREF} />
          </div>
        </>
      ) : (
        <EmptyDashboardState ctaHref={START_PROJECT_HREF} />
      )}
    </div>
  );
}
