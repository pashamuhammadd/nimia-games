"use client";

import * as React from "react";
import { Power, Target } from "lucide-react";
import { cn, Input, Button } from "@nimia/ui";
import { setQuestActiveAction, updateQuestRewardAction } from "./actions";

export type QuestDefinitionRow = {
  id: string;
  key: string;
  title: string;
  description: string;
  goal_type: "orders_count" | "total_spend_usd" | "referral_count";
  goal_value: number;
  reward_discount_percent: number;
  is_active: boolean;
  sort_order: number;
};

const GOAL_LABELS: Record<QuestDefinitionRow["goal_type"], string> = {
  orders_count: "paid orders",
  total_spend_usd: "USD spent",
  referral_count: "referred paid clients",
};

export function QuestsAdminList({ quests }: { quests: QuestDefinitionRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {quests.map((quest) => (
        <QuestRow key={quest.id} quest={quest} />
      ))}
    </div>
  );
}

function QuestRow({ quest }: { quest: QuestDefinitionRow }) {
  const [reward, setReward] = React.useState(String(quest.reward_discount_percent));
  const [isSavingReward, setIsSavingReward] = React.useState(false);
  const [isTogglingActive, setIsTogglingActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isActive, setIsActive] = React.useState(quest.is_active);
  const [saved, setSaved] = React.useState(false);

  async function handleSaveReward() {
    setIsSavingReward(true);
    setError(null);
    setSaved(false);
    const result = await updateQuestRewardAction(quest.id, Number(reward));
    setIsSavingReward(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleToggleActive() {
    setIsTogglingActive(true);
    setError(null);
    const result = await setQuestActiveAction(quest.id, !isActive);
    setIsTogglingActive(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsActive((v) => !v);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Target className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{quest.title}</p>
            <span className={cn("text-xs font-medium", isActive ? "text-emerald-300" : "text-white/40")}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-white/45">
            {quest.description} · Goal: {quest.goal_value.toLocaleString("en-US")} {GOAL_LABELS[quest.goal_type]}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            max={100}
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            className="h-9 w-20"
          />
          <span className="text-xs text-white/40">%</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSavingReward}
            isLoading={isSavingReward}
            onClick={handleSaveReward}
          >
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
        <button
          type="button"
          disabled={isTogglingActive}
          onClick={handleToggleActive}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <Power className="h-3.5 w-3.5" aria-hidden="true" />
          {isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
      {error ? <p className="w-full text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
