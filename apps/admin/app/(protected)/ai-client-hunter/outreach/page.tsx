import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { OutreachQueueList, type OutreachRow } from "./OutreachQueueList";

export const metadata = { title: "AI Client Hunter · Outreach Queue" };

export default async function AIHunterOutreachPage() {
  const supabase = createServerClient(await cookies());

  const { data: outreachRows } = await supabase
    .from("ai_outreach")
    .select(
      "id, lead_id, message, is_edited, generated_by_ai, approved_by, approved_at, created_at, ai_leads(id, project_name, prospect_name, username, platform, lead_score, qualification_status, outreach_status, source_url, contact_url, contact_method)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (outreachRows ?? []) as unknown as OutreachRow[];
  const draftedLeadIds = new Set(rows.map((r) => r.lead_id));

  const { data: readyLeads } = await supabase
    .from("ai_leads")
    .select("id, project_name, prospect_name, username, platform, lead_score")
    .in("qualification_status", ["qualified", "possible"])
    .eq("outreach_status", "not_contacted")
    .order("lead_score", { ascending: false })
    .limit(20);

  const waitingForDraft = (readyLeads ?? []).filter((lead) => !draftedLeadIds.has(lead.id));

  return (
    <div className="flex flex-col gap-6">
      {waitingForDraft.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">Qualified leads waiting for a draft</h2>
          <p className="mt-1 text-xs text-white/40">Open a lead and click &ldquo;Generate Outreach&rdquo; to add it here.</p>
          <div className="mt-3 flex flex-col gap-2">
            {waitingForDraft.map((lead: any) => (
              <Link
                key={lead.id}
                href={`/ai-client-hunter/leads?open=${lead.id}`}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/75 transition-colors hover:border-white/[0.12]"
              >
                <span className="truncate">{lead.project_name || lead.prospect_name || lead.username || "Unnamed prospect"}</span>
                <span className="shrink-0 text-xs text-white/40">Score {lead.lead_score}/100</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <OutreachQueueList rows={rows} />
    </div>
  );
}
