import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { QuestsAdminList, type QuestDefinitionRow } from "./QuestsAdminList";

export const metadata = { title: "Quests" };

// Admin management page for the Quests feature (4 Agustus 2026, P1). Every
// write goes through ./actions.ts, which relies on
// quest_definitions_admin_write (packages/db/migrations/0022_quests.sql) as
// the real security boundary. There's no "create quest" form here — the 4
// starting quests are seeded directly by 0022 and adding a 5th goal_type
// would need new SQL in check_and_award_quests()/get_client_quest_progress
// anyway, so this page only lets admin tune the reward % and active state
// of the existing ones, not define brand new goal shapes.
export default async function QuestsAdminPage() {
  const supabase = createServerClient(await cookies());

  const { data: quests } = await supabase
    .from("quest_definitions")
    .select("id, key, title, description, goal_type, goal_value, reward_discount_percent, is_active, sort_order")
    .order("sort_order", { ascending: true });

  const { count: completionsCount } = await supabase
    .from("client_quest_completions")
    .select("id", { count: "exact", head: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quests</h1>
        <p className="mt-1 text-sm text-white/45">
          Milestones clients complete automatically to earn a discount voucher.
          {completionsCount != null ? ` ${completionsCount} completions awarded so far.` : ""}
        </p>
      </div>

      <QuestsAdminList quests={(quests as any as QuestDefinitionRow[]) ?? []} />
    </div>
  );
}
