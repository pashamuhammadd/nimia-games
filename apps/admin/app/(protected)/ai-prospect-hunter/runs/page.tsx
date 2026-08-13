import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { formatRelativeTime } from "../../../lib/relativeTime";

export const metadata = { title: "AI Prospect Hunter · Agent Runs" };

type RunRow = {
  id: string;
  target_categories: string[];
  requested_target: number;
  min_opportunity_score: number;
  sources: string[];
  status: string;
  projects_discovered: number;
  projects_analyzed: number;
  qualified_opportunities: number;
  rejected_projects: number;
  is_demo: boolean;
  errors: { step: string; message: string }[] | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const RUN_STATUS_META: Record<string, { label: string; dotClass: string }> = {
  pending: { label: "Pending", dotClass: "bg-slate-400" },
  running: { label: "Running", dotClass: "bg-amber-400" },
  completed: { label: "Completed", dotClass: "bg-emerald-400" },
  failed: { label: "Failed", dotClass: "bg-red-400" },
  cancelled: { label: "Cancelled", dotClass: "bg-white/30" },
};

// Spec section 23's own example ("Today: 20 projects analyzed, 8 high, 7
// medium, 5 low") — the summary card above the full run table.
export default async function AIHunterAgentRunsPage() {
  const supabase = createServerClient(await cookies());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: runs }, { data: todayAnalysis }] = await Promise.all([
    supabase
      .from("ai_agent_runs")
      .select(
        "id, target_categories, requested_target, min_opportunity_score, sources, status, projects_discovered, projects_analyzed, qualified_opportunities, rejected_projects, is_demo, errors, started_at, completed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("ai_project_analysis")
      .select("animation_opportunity")
      .gte("analyzed_at", startOfToday.toISOString()),
  ]);

  const rows = (todayAnalysis ?? []) as { animation_opportunity: string }[];
  const todaySummary = {
    analyzed: rows.length,
    high: rows.filter((r) => r.animation_opportunity === "very_high" || r.animation_opportunity === "high").length,
    medium: rows.filter((r) => r.animation_opportunity === "medium").length,
    low: rows.filter((r) => r.animation_opportunity === "low" || r.animation_opportunity === "none").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Today</h2>
        <p className="mt-2 text-sm text-white/70">
          {todaySummary.analyzed} project{todaySummary.analyzed === 1 ? "" : "s"} analyzed — {todaySummary.high} high,{" "}
          {todaySummary.medium} medium, {todaySummary.low} low opportunity.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Run History</h2>
        {(runs ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No runs yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {((runs ?? []) as RunRow[]).map((run) => {
              const meta = RUN_STATUS_META[run.status] ?? RUN_STATUS_META.pending;
              return (
                <div key={run.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                      <span className="text-sm font-medium text-white/85">{meta.label}</span>
                      <span className="text-xs text-white/50">
                        {run.target_categories?.length ? run.target_categories.slice(0, 4).join(", ") : "All categories"}
                      </span>
                      {run.is_demo ? (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                          Demo
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-white/35">{formatRelativeTime(run.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/50">
                    Target {run.requested_target} · Min score {run.min_opportunity_score} · Sources: {run.sources.join(", ") || "—"}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {run.projects_discovered} discovered · {run.projects_analyzed} analyzed · {run.qualified_opportunities} qualified ·{" "}
                    {run.rejected_projects} low/none
                  </p>
                  {run.errors && run.errors.length > 0 ? (
                    <ul className="mt-1.5 list-inside list-disc text-[11px] text-amber-300/80">
                      {run.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          {err.step}: {err.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
