"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";

/** Both admin-configurable installment flexibility fee percentages
 * (packages/db/migrations/0051_tiered_installment_plans.sql's
 * `installment_settings.fee_percentage_two_milestones` /
 * `fee_percentage_three_milestones`) — public-readable by design so a
 * visitor configuring an order can see the real numbers for both plans
 * before ever submitting anything. */
export interface InstallmentFeePercentages {
  twoMilestones: number;
  threeMilestones: number;
}

// Reads the tiered installment fee percentages (18 Agustus 2026 — replaces
// the single flat `fee_percentage` this used to read, see
// 0051_tiered_installment_plans.sql's own header for why: 3 installments
// now costs more than 2 by design, not by admin discipline). Falls back to
// the DB columns' own defaults (20 / 30) if the read ever fails for any
// reason — never blocks the Payment Method step from rendering over a
// transient read error. The AUTHORITATIVE numbers are still always
// re-read server-side again at submit time (submitOrderAction/
// submitCustomOrderAction), this is preview-only, same posture the
// single-value version of this function always had.
export async function getInstallmentFeePercentagesAction(): Promise<InstallmentFeePercentages> {
  try {
    const supabase = createServerClient(await cookies());
    const { data, error } = await supabase
      .from("installment_settings")
      .select("fee_percentage_two_milestones, fee_percentage_three_milestones")
      .eq("id", true)
      .single();
    if (error || !data) return { twoMilestones: 20, threeMilestones: 30 };
    return {
      twoMilestones: Number(data.fee_percentage_two_milestones),
      threeMilestones: Number(data.fee_percentage_three_milestones),
    };
  } catch {
    return { twoMilestones: 20, threeMilestones: 30 };
  }
}
