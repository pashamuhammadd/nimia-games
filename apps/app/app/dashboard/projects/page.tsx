import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { ProjectsList, type ProjectRow } from "./ProjectsList";
import { getProjectPaymentSummaries } from "@/modules/order/pricing/order-payment-summary";

export const metadata = { title: "Projects" };

// Real implementation (10 Agustus 2026) — replaces the "Coming in Phase 5"
// placeholder. A project row now exists for every paid order (see
// packages/db/migrations/0029_auto_create_project_on_paid.sql), so this is
// the first time this page could ever show real data.
export default async function ProjectsPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  let projects: ProjectRow[] = [];

  if (client) {
    const { data } = await supabase
      .from("projects")
      // order_id added (16 Agustus 2026, Fase 8 Client Dashboard —
      // payment summary on project card) — join path to
      // orders/order_installments, see getProjectPaymentSummaries.
      .select(
        "id, title, status, progress, start_date, deadline, created_at, order_id, project_updates(id, to_status, note, created_at)",
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    const rows = data ?? [];
    const paymentSummaries = await getProjectPaymentSummaries(
      supabase,
      rows.map((p: any) => ({ id: p.id, orderId: p.order_id })),
    );

    projects = rows.map((p: any) => {
      const updates = Array.isArray(p.project_updates) ? p.project_updates : [];
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        startDate: p.start_date,
        deadline: p.deadline,
        createdAt: p.created_at,
        updates: updates.map((u: any) => ({
          id: u.id,
          toStatus: u.to_status,
          note: u.note,
          createdAt: u.created_at,
        })),
        paymentSummary: paymentSummaries.get(p.id) ?? null,
      };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          Status, progress, and the update timeline for every project you have with Nimia Studio.
        </p>
      </div>

      {projects.length > 0 ? (
        <ProjectsList projects={projects} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
          <p className="max-w-sm text-sm text-white/50">
            No projects yet. Once an order is paid, it becomes a project you can track here.
          </p>
        </div>
      )}
    </div>
  );
}
