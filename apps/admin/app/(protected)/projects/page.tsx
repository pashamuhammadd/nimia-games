import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { ProjectsList, type ProjectRow } from "./ProjectsList";

export const metadata = { title: "Projects" };

// Real implementation (10 Agustus 2026) — replaces the ComingSoonState
// placeholder. Projects didn't exist to manage before this because nothing
// in the current (post-negotiation/crypto-payment) order flow ever created
// one — see packages/db/migrations/0029_auto_create_project_on_paid.sql's
// own comment for the gap and the fix (a trigger + one-time backfill for
// orders already paid before this migration ran).
export default async function ProjectsPage({
  searchParams,
}: {
  // `q` (18 Agustus 2026, Fase 13 click-test bugfix) — lets
  // OrderDetailPanel's new "Manage Production" link pre-fill the search
  // box with the order's client label, so admin lands directly on the
  // right project instead of having to find it in an unfiltered list.
  // See OrderDetailPanel.tsx's own comment on the button this supports.
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = createServerClient(await cookies());

  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, status, progress, start_date, deadline, created_at, clients(company_name), project_updates(id, to_status, note, created_at), project_files(id, file_name, file_url, file_type, created_at)",
    )
    .order("created_at", { ascending: false });

  const projects: ProjectRow[] = (data ?? []).map((p: any) => {
    const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    const updates = Array.isArray(p.project_updates) ? p.project_updates : [];
    const files = Array.isArray(p.project_files) ? p.project_files : [];
    return {
      id: p.id,
      title: p.title,
      clientLabel: client?.company_name || "Unknown client",
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
      deliverables: files
        .filter((f: any) => f.file_type === "deliverable")
        .map((f: any) => ({
          id: f.id,
          fileName: f.file_name,
          fileUrl: f.file_url,
          createdAt: f.created_at,
        })),
    };
  });

  const activeCount = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Project Management</h1>
        <p className="mt-1 text-sm text-white/45">
          Every project's status, progress, and timeline, from payment through delivery.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Total Projects</p>
          <p className="mt-1 text-xl font-bold text-white">{projects.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Active</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Completed</p>
          <p className="mt-1 text-xl font-bold text-white/60">{completedCount}</p>
        </div>
      </div>

      <ProjectsList projects={projects} initialQuery={q ?? ""} />
    </div>
  );
}
