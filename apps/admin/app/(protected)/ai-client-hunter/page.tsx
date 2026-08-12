import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { aiQualificationStatusMeta, leadScoreTone } from "../../lib/aiHunterStatus";
import { formatRelativeTime } from "../../lib/relativeTime";

export const metadata = { title: "AI Client Hunter · Overview" };

type RecentLead = {
  id: string;
  project_name: string | null;
  prospect_name: string | null;
  username: string | null;
  platform: string;
  lead_score: number;
  animation_type: string | null;
  detected_need: string | null;
  buying_intent: string;
  qualification_status: string;
  is_demo: boolean;
  discovered_at: string;
};

const SCORE_BUCKETS = [
  { label: "0–39", from: 0, to: 39 },
  { label: "40–69", from: 40, to: 69 },
  { label: "70–89", from: 70, to: 89 },
  { label: "90–100", from: 90, to: 100 },
];

export default async function AIClientHunterOverviewPage() {
  const supabase = createServerClient(await cookies());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: todayLeadsCount },
    { count: qualifiedLeadsCount },
    { count: hotLeadsCount },
    { count: contactedCount },
    { count: repliesCount },
    { count: conversionsCount },
    ...bucketCounts
  ] = await Promise.all([
    supabase.from("ai_leads").select("id", { count: "exact", head: true }).gte("discovered_at", startOfToday.toISOString()),
    supabase.from("ai_leads").select("id", { count: "exact", head: true }).eq("qualification_status", "qualified"),
    supabase.from("ai_leads").select("id", { count: "exact", head: true }).gte("lead_score", 80),
    supabase.from("ai_leads").select("id", { count: "exact", head: true }).eq("outreach_status", "contacted"),
    supabase
      .from("ai_leads")
      .select("id", { count: "exact", head: true })
      .in("outreach_status", ["replied"]),
    supabase.from("ai_leads").select("id", { count: "exact", head: true }).eq("qualification_status", "converted"),
    ...SCORE_BUCKETS.map((bucket) =>
      supabase.from("ai_leads").select("id", { count: "exact", head: true }).gte("lead_score", bucket.from).lte("lead_score", bucket.to),
    ),
  ]);

  const { data: recentLeads } = await supabase
    .from("ai_leads")
    .select("id, project_name, prospect_name, username, platform, lead_score, animation_type, detected_need, buying_intent, qualification_status, is_demo, discovered_at")
    .in("qualification_status", ["qualified", "possible"])
    .order("discovered_at", { ascending: false })
    .limit(5);

  const { count: totalLeadsCount } = await supabase.from("ai_leads").select("id", { count: "exact", head: true });

  const stats = [
    { label: "Today's Leads", value: todayLeadsCount ?? 0 },
    { label: "Qualified Leads", value: qualifiedLeadsCount ?? 0 },
    { label: "Hot Leads (80+)", value: hotLeadsCount ?? 0 },
    { label: "Contacted", value: contactedCount ?? 0 },
    { label: "Replies", value: repliesCount ?? 0 },
    { label: "Conversions", value: conversionsCount ?? 0 },
  ];

  const maxBucket = Math.max(1, ...bucketCounts.map((b) => b.count ?? 0));
  const rows = (recentLeads ?? []) as RecentLead[];

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
          <h2 className="text-sm font-semibold text-white">Lead Score Distribution</h2>
          <p className="mt-1 text-xs text-white/40">{totalLeadsCount ?? 0} lead{(totalLeadsCount ?? 0) === 1 ? "" : "s"} total</p>
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
            <h2 className="text-sm font-semibold text-white">Recent Qualified Leads</h2>
            <Link href="/ai-client-hunter/leads" className="text-xs font-medium text-[var(--nimia-pink)] hover:underline">
              View all
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 text-center text-sm text-white/40">
              No qualified leads yet — run the AI Hunter from{" "}
              <Link href="/ai-client-hunter/find" className="text-[var(--nimia-pink)] hover:underline">
                Find Clients
              </Link>
              .
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {rows.map((lead) => {
                const tone = leadScoreTone(lead.lead_score);
                const meta = aiQualificationStatusMeta(lead.qualification_status);
                const label = lead.project_name || lead.prospect_name || lead.username || "Unnamed prospect";
                return (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${tone.ringClass} ${tone.textClass}`}>
                          {lead.lead_score >= 80 ? "🔥" : "•"} {lead.lead_score}/100
                        </span>
                        {lead.is_demo ? (
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                            Demo
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1 text-xs text-white/40">
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold text-white">{label}</p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {lead.animation_type ? `Need: ${lead.animation_type}` : "Need: unspecified"} · Intent:{" "}
                        {lead.buying_intent} · Source: {lead.platform}
                      </p>
                    </div>
                    <Link
                      href={`/ai-client-hunter/leads?open=${lead.id}`}
                      className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 hover:bg-white/[0.06] sm:self-center"
                    >
                      View Lead
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
