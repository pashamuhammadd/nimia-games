import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@nimia/db";
import { LeadsList } from "./LeadsList";
import { AI_QUALIFICATION_STATUS_FILTERS } from "../../../lib/aiHunterStatus";

export const metadata = { title: "AI Client Hunter · Leads" };

const PAGE_SIZE = 50;

export default async function AIHunterLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = createServerClient(await cookies());

  let query = supabase
    .from("ai_leads")
    .select(
      "id, project_name, prospect_name, username, platform, source_url, project_url, detected_service, animation_type, project_description, detected_need, buying_intent, budget_information, deadline_information, lead_score, score_breakdown, qualification_status, qualification_reason, evidence, contact_method, contact_url, discovered_at, last_updated, outreach_status, is_demo",
    )
    .order("lead_score", { ascending: false })
    .order("discovered_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (status && status !== "all") {
    query = query.eq("qualification_status", status);
  }

  const { data: leads } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {AI_QUALIFICATION_STATUS_FILTERS.map((filter) => {
          const isActive = (status ?? "all") === filter.value;
          const href = filter.value === "all" ? "/ai-client-hunter/leads" : `/ai-client-hunter/leads?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-[var(--nimia-crimson)]/15 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
                  : "rounded-full px-3.5 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* useSearchParams (for the `?open=<id>` deep link from Overview)
          needs a Suspense boundary — this page is already dynamic (reads
          cookies()), so this only affects LeadsList's own hydration, not
          the server fetch above. */}
      <Suspense fallback={null}>
        <LeadsList leads={(leads as any) ?? []} />
      </Suspense>
    </div>
  );
}
