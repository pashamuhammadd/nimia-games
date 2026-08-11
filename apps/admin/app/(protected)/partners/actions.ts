"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { isFounderRole } from "../../lib/roles";

export type PartnerReferralActivityRow = {
  referral_id: string;
  referred_name: string | null;
  order_status: string | null;
  reward_usd: number;
  created_at: string;
};

export type GetPartnerReferralActivityResult =
  | { success: true; referrals: PartnerReferralActivityRow[] }
  | { success: false; error: string };

// Wraps get_partner_referral_activity() (packages/db/migrations/0016_partner_program.sql)
// — already admin-accessible (its own internal check is
// "user_id = auth.uid() OR is_admin()"), reused as-is here rather than
// adding a duplicate RPC just for this page's expand-a-partner-row
// interaction. Called on demand (not from the initial page.tsx load) so
// PartnersAdminList doesn't have to fetch every partner's full referral
// history up front just to show a directory list.
export async function getPartnerReferralActivityAction(
  partnerId: string,
): Promise<GetPartnerReferralActivityResult> {
  const supabase = createServerClient(await cookies());
  const { data, error } = await supabase.rpc("get_partner_referral_activity", { p_partner_id: partnerId });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, referrals: (data as any as PartnerReferralActivityRow[]) ?? [] };
}

export type ProcessWithdrawalResult = { success: true } | { success: false; error: string };

// Shared founder-only gate for the two actions below — the underlying
// RPCs (packages/db/migrations/0033_partner_reward_withdrawals.sql) only
// check is_admin() at the DB layer (same as every other admin RPC in this
// schema — see that migration's own comment on why), so THIS is the only
// thing standing between a staff account and manually-sent-money actions.
// Same "app-layer founder gate" pattern as the /finance page's
// isFounderRole redirect (apps/admin/app/lib/roles.ts).
async function assertFounder(supabase: ReturnType<typeof createServerClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Your session has expired, please log in again.";

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!isFounderRole(profile?.role)) return "Only a founder can approve or reject withdrawal requests.";
  return null;
}

// Founder confirms they've manually sent the crypto for this request and
// marks it paid — see approve_partner_withdrawal() in 0033 for what
// actually happens (flips the request + its locked partner_rewards rows,
// notifies the partner).
export async function approveWithdrawalAction(
  requestId: string,
  note?: string,
): Promise<ProcessWithdrawalResult> {
  const supabase = createServerClient(await cookies());
  const founderError = await assertFounder(supabase);
  if (founderError) return { success: false, error: founderError };

  const { error } = await supabase.rpc("approve_partner_withdrawal", {
    p_request_id: requestId,
    p_admin_note: note?.trim() || null,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/partners");
  return { success: true };
}

// Founder declines a request (e.g. bad wallet address) — releases the
// locked reward rows back to 'available' so the partner can request
// again. `note` is shown to the partner as the decline reason, so ask for
// one in the UI even though the RPC itself allows it to be empty.
export async function rejectWithdrawalAction(
  requestId: string,
  note?: string,
): Promise<ProcessWithdrawalResult> {
  const supabase = createServerClient(await cookies());
  const founderError = await assertFounder(supabase);
  if (founderError) return { success: false, error: founderError };

  const { error } = await supabase.rpc("reject_partner_withdrawal", {
    p_request_id: requestId,
    p_admin_note: note?.trim() || null,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/partners");
  return { success: true };
}
