import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { FindClientsForm } from "./FindClientsForm";
import { listDiscoverySourceStatuses } from "../../../../lib/ai-agent/discovery/registry";
import { formatRelativeTime } from "../../../lib/relativeTime";

export const metadata = { title: "AI Client Hunter · Find Clients" };

type RunRow = {
  id: string;
  target: string;
  status: string;
  candidates_found: number;
  candidates_analyzed: number;
  qualified_leads: number;
  rejected_leads: number;
  is_demo: boolean;
  errors: { step: string; message: string }[] | null;
  created_at: string;
  completed_at: string | null;
};

const RUN_STATUS_DOT: Record<string, string> = {
  pending: "bg-slate-400",
  running: "bg-amber-400",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
  cancelled: "bg-white/30",
};

export default async function AIHunterFindClientsPage() {
  const supabase = createServerClient(await cookies());
  const sources = listDiscoverySourceStatuses();

  const { data: runs } = await supabase
    .from("ai_agent_runs")
    .select("id, target, status, candidates_found, candidates_analyzed, qualified_leads, rejected_leads, is_demo, errors, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col gap-6">
      <FindClientsForm sources={sources} />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
        {(runs ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No runs yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {((runs ?? []) as RunRow[]).map((run) => (
              <div key={run.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${RUN_STATUS_DOT[run.status] ?? "bg-slate-400"}`} aria-hidden="true" />
                    <span className="text-sm font-medium text-white/85">{run.target}</span>
                    {run.is_demo ? (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                        Demo
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-white/35">{formatRelativeTime(run.created_at)}</span>
                </div>
                <p className="mt-1.5 text-xs text-white/50">
                  {run.candidates_found} found · {run.candidates_analyzed} analyzed · {run.qualified_leads} qualified/possible ·{" "}
                  {run.rejected_leads} rejected
                </p>
                {run.errors && run.errors.length > 0 ? (
                  <ul className="mt-1.5 list-inside list-disc text-[11px] text-amber-300/80">
                    {run.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>
                        {err.step}: {err.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
