"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";

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
