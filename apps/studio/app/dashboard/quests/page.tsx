import { cookies } from "next/headers";
import { Target } from "lucide-react";
import { createServerClient } from "@nimia/db";
import { QuestCard, getQuestOverview } from "@/modules/quests";

export const metadata = { title: "Quests" };

// Real implementation (4 Agustus 2026, P1) — replaces the ComingSoonState
// placeholder. Server Component, per the module architecture rules: only
// imports from "@/modules/quests" (the module's root barrel).
export default async function QuestsPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const overview = client ? await getQuestOverview(supabase, client.id) : { quests: [], completedCount: 0 };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quests</h1>
        <p className="mt-1 text-sm text-white/45">
          Complete milestones as a Nimia Games client to earn discount vouchers automatically.
          {overview.quests.length > 0 ? ` ${overview.completedCount} / ${overview.quests.length} completed.` : ""}
        </p>
      </div>

      {overview.quests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
          <Target className="h-8 w-8 text-white/25" aria-hidden="true" />
          <p className="text-sm text-white/50">No active quests right now — check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {overview.quests.map((quest) => (
            <QuestCard key={quest.questId} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}
