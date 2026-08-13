import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { opportunityLevelMeta, opportunityScoreTone, aiProspectStatusMeta } from "../../lib/aiHunterStatus";

export const metadata = { title: "AI Prospect Hunter · Overview" };

type AnalysisRow = { animation_opportunity: string; opportunity_score: number; recommended_services: string[] | null };
type StatusRow = { status: string; outreach_status: string };
type RecentProjectRow = {
  id: string;
  name: string;
  symbol: string | null;
  categories: string[];
  market_cap_usd: number | null;
  discovered_at: string;
  ai_project_analysis: AnalysisRow | AnalysisRow[] | null;
  ai_prospect_status: StatusRow | StatusRow[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const SCORE_BUCKETS = [
  { label: "0–39", from: 0, to: 39 },
  { label: "40–69", from: 40, to: 69 },
  { label: "70–89", from: 70, to: 89 },
  { label: "90–100", from: 90, to: 100 },
];

export default async function AIProspectHunterOverviewPage() {
  const supabase = createServerClient(await cookies());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: todayProjectsCount },
    { count: qualifiedCount },
    { count: veryHighCount },
    { count: contactedCount },
    { count: repliesCount },
    { count: clientsCount },
    ...bucketCounts
  ] = await Promise.all([
    supabase.from("ai_projects").select("id", { count: "exact", head: true }).gte("discovered_at", startOfToday.toISOString()),
    supabase.from("ai_prospect_status").select("id", { count: "exact", head: true }).eq("status", "qualified_prospect"),
    supabase.from("ai_project_analysis").select("id", { count: "exact", head: true }).eq("animation_opportunity", "very_high"),
    supabase.from("ai_prospect_status").select("id", { count: "exact", head: true }).eq("outreach_status", "contacted"),
    supabase.from("ai_prospect_status").select("id", { count: "exact", head: true }).eq("outreach_status", "replied"),
    supabase.from("ai_prospect_status").select("id", { count: "exact", head: true }).eq("status", "client"),
    ...SCORE_BUCKETS.map((bucket) =>
      supabase.from("ai_project_analysis").select("id", { count: "exact", head: true }).gte("opportunity_score", bucket.from).lte("opportunity_score", bucket.to),
    ),
  ]);

  const { data: recentProjects } = await supabase
    .from("ai_projects")
    .select(
      "id, name, symbol, categories, market_cap_usd, discovered_at, ai_project_analysis(animation_opportunity, opportunity_score, recommended_services), ai_prospect_status(status, outreach_status)",
    )
    .order("discovered_at", { ascending: false })
    .limit(30);

  const { count: totalProjectsCount } = await supabase.from("ai_projects").select("id", { count: "exact", head: true });

  const stats = [
    { label: "Today's Projects", value: todayProjectsCount ?? 0 },
    { label: "Qualified Prospects", value: qualifiedCount ?? 0 },
    { label: "Very High Opportunity", value: veryHighCount ?? 0 },
    { label: "Contacted", value: contactedCount ?? 0 },
    { label: "Replies", value: repliesCount ?? 0 },
    { label: "Clients", value: clientsCount ?? 0 },
  ];

  const maxBucket = Math.max(1, ...bucketCounts.map((b) => b.count ?? 0));
  const rows = ((recentProjects ?? []) as RecentProjectRow[])
    .map((row) => ({ row, analysis: one(row.ai_project_analysis), status: one(row.ai_prospect_status) }))
    .filter((r) => r.analysis && (r.analysis.animation_opportunity === "very_high" || r.analysis.animation_opportunity === "high"))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-xs font-medium text-white/45">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-white">Opportunity Score Distribution</h2>
          <p className="mt-1 text-xs text-white/40">{totalProjectsCount ?? 0} project{(totalProjectsCount ?? 0) === 1 ? "" : "s"} total</p>
          <div className="mt-4 flex flex-col gap-3">
            {SCORE_BUCKETS.map((bucket, index) => {
              const count = bucketCounts[index]?.count ?? 0;
              const width = Math.round((count / maxBucket) * 100);
              return (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{bucket.label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
                      style={{ width: `${Math.max(width, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">High-Opportunity Projects</h2>
            <Link href="/ai-prospect-hunter/projects" className="text-xs font-medium text-[var(--nimia-pink)] hover:underline">
              View all
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 text-center text-sm text-white/40">
              No high-opportunity projects yet — run the AI Hunter from{" "}
              <Link href="/ai-prospect-hunter/find" className="text-[var(--nimia-pink)] hover:underline">
                Find Prospects
              </Link>
              .
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {rows.map(({ row, analysis, status }) => {
                const level = opportunityLevelMeta(analysis!.animation_opportunity);
                const tone = opportunityScoreTone(analysis!.opportunity_score);
                const statusMeta = aiProspectStatusMeta(status?.status ?? "project");
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
                          {analysis!.opportunity_score >= 80 ? "🔥" : "•"} {analysis!.opportunity_score}/100
                        </span>
                        <span className={`rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${level.textClass}`}>
                          {level.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} aria-hidden="true" />
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold text-white">
                        {row.name}
                        {row.symbol ? ` ($${row.symbol})` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {row.categories?.[0] ?? "Uncategorized"} · {analysis!.recommended_services?.[0] ?? "Service unclear"}
                      </p>
                    </div>
                    <Link
                      href={`/ai-prospect-hunter/projects?open=${row.id}`}
                      className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 hover:bg-white/[0.06] sm:self-center"
                    >
                      View Project
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
