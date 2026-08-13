import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { OutreachQueueList, type OutreachRow } from "./OutreachQueueList";

export const metadata = { title: "AI Prospect Hunter · Outreach" };

export default async function AIHunterOutreachPage() {
  const supabase = createServerClient(await cookies());

  const { data: outreachRows } = await supabase
    .from("ai_outreach")
    .select(
      "id, project_id, message, is_edited, generated_by_ai, approved_by, approved_at, created_at, " +
        "ai_projects(id, name, symbol, logo_url, homepage_url, ai_project_analysis(opportunity_score, animation_opportunity), ai_prospect_status(status, outreach_status))",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (outreachRows ?? []) as unknown as OutreachRow[];
  const draftedProjectIds = new Set(rows.map((r) => r.project_id));

  const { data: readyProjects } = await supabase
    .from("ai_prospect_status")
    .select("project_id, status, outreach_status, ai_projects(id, name, symbol, ai_project_analysis(opportunity_score))")
    .in("status", ["opportunity", "qualified_prospect"])
    .eq("outreach_status", "not_contacted")
    .limit(20);

  const waitingForDraft = (readyProjects ?? []).filter((row: any) => !draftedProjectIds.has(row.project_id));

  return (
    <div className="flex flex-col gap-6">
      {waitingForDraft.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">Prospects waiting for a draft</h2>
          <p className="mt-1 text-xs text-white/40">Open a project and click &ldquo;Generate Outreach&rdquo; to add it here.</p>
          <div className="mt-3 flex flex-col gap-2">
            {waitingForDraft.map((row: any) => {
              const project = Array.isArray(row.ai_projects) ? row.ai_projects[0] : row.ai_projects;
              const analysis = project ? (Array.isArray(project.ai_project_analysis) ? project.ai_project_analysis[0] : project.ai_project_analysis) : null;
              return (
                <Link
                  key={row.project_id}
                  href={`/ai-prospect-hunter/projects?open=${row.project_id}`}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/75 transition-colors hover:border-white/[0.12]"
                >
                  <span className="truncate">{project?.name ?? "Unknown project"}{project?.symbol ? ` ($${project.symbol})` : ""}</span>
                  <span className="shrink-0 text-xs text-white/40">Score {analysis?.opportunity_score ?? 0}/100</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <OutreachQueueList rows={rows} />
    </div>
  );
}
