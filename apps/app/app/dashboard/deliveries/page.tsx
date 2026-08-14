import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { DeliveriesList, type DeliveryProjectGroup } from "./DeliveriesList";

export const metadata = { title: "Deliveries" };

// Real implementation (10 Agustus 2026) — replaces the "Coming in Phase 5"
// placeholder. Deliverable files are project_files rows with
// file_type='deliverable', uploaded by the studio team from apps/admin's
// Projects page (see apps/admin/app/(protected)/projects/ProjectDetail.tsx).
export default async function DeliveriesPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  let groups: DeliveryProjectGroup[] = [];

  if (client) {
    const { data } = await supabase
      .from("project_files")
      .select("id, file_name, file_url, file_type, created_at, projects!inner(id, title, client_id)")
      .eq("file_type", "deliverable")
      .eq("projects.client_id", client.id)
      .order("created_at", { ascending: false });

    const byProject = new Map<string, DeliveryProjectGroup>();
    for (const row of (data ?? []) as any[]) {
      const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
      if (!project) continue;
      const existing = byProject.get(project.id);
      const file = {
        id: row.id,
        fileName: row.file_name,
        fileUrl: row.file_url,
        createdAt: row.created_at,
      };
      if (existing) {
        existing.files.push(file);
      } else {
        byProject.set(project.id, {
          projectId: project.id,
          projectTitle: project.title,
          files: [file],
        });
      }
    }
    groups = Array.from(byProject.values());
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          Every finished file the Nimia Studio team has delivered for your projects.
        </p>
      </div>

      <DeliveriesList groups={groups} />
    </div>
  );
}
