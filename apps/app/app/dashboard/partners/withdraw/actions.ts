"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { requestPartnerWithdrawal, withdrawalRequestSchema } from "@/modules/partners";

export type RequestWithdrawalResult =
  | { success: true; amountUsd: number }
  | { success: false; error: string };

// Client-facing half of the withdrawal flow (packages/db/migrations/0033_partner_reward_withdrawals.sql,
// 11 Agustus 2026, per user decision). Same "validate -> call
// service -> revalidate" shape as app/dashboard/support/actions.ts's
// createSupportTicketAction — the RPC underneath
// (request_partner_withdrawal) is the real authority (partner ownership,
// available-balance check, one-open-request-at-a-time), this action just
// validates input shape first for a fast, friendly error and revalidates
// the pages that show the new "in review" state afterward.
export async function requestPartnerWithdrawalAction(input: {
  walletNetwork: string;
  walletAddress: string;
}): Promise<RequestWithdrawalResult> {
  const parsed = withdrawalRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  try {
    const request = await requestPartnerWithdrawal(
      supabase,
      parsed.data.walletNetwork,
      parsed.data.walletAddress,
    );
    revalidatePath("/dashboard/partners");
    revalidatePath("/dashboard/partners/withdraw");
    return { success: true, amountUsd: request.amountUsd };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Couldn't submit your withdrawal request. Please try again.",
    };
  }
}
