import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveReferralStatus } from "../utils/derive-referral-status";
import { FOUNDING_PARTNER_QUOTA } from "../constants/founding-partner";
import type { Partner, FoundingPartnerProgramStatus } from "../types/partner";
import type { Referral } from "../types/referral";

// ------------------------------------------------------------------
// Real data-access layer (30 Juli 2026, migration
// packages/db/migrations/0016_partner_program.sql) — this used to be a
// mock/seeded-random stand-in; see git history on this file for that
// version if you ever need to compare. Every method takes the caller's
// already-authenticated Supabase client (created via
// `createServerClient(await cookies())` in a Server Component/Action) so
// RLS applies exactly the way it does everywhere else in this app — this
// repository never uses a service-role key or bypasses RLS itself
// (the two RPCs it calls below ARE security-definer on the Postgres side,
// but each checks `auth.uid()` ownership internally — see 0016's comments
// on get_partner_metrics/get_partner_referral_activity).
// ------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.nimiagames.com";

function referralLinkFor(code: string): string {
  return `${SITE_URL}/r/${code}`;
}

export interface PartnerRepository {
  findByUserId(supabase: SupabaseClient, userId: string): Promise<Partner>;
  findReferralsByPartnerId(supabase: SupabaseClient, partnerId: string): Promise<Referral[]>;
  getFoundingProgramStatus(supabase: SupabaseClient): Promise<FoundingPartnerProgramStatus>;
}

export const partnerRepository: PartnerRepository = {
  async findByUserId(supabase, userId) {
    const { data: partnerRow, error: partnerError } = await supabase
      .from("partners")
      .select("id, user_id, referral_code, is_founding_partner, founding_partner_number, created_at")
      .eq("user_id", userId)
      .single();

    if (partnerError || !partnerRow) {
      // Should not happen for any user created after 0016 (the signup
      // trigger provisions one automatically) or any user that existed
      // before it (the migration's backfill covers them) — surfacing a
      // clear error here beats silently rendering a broken page if this
      // migration somehow hasn't run yet.
      throw new Error(
        `No partners row found for user ${userId}. Has packages/db/migrations/0016_partner_program.sql been run yet? (${partnerError?.message ?? "no row returned"})`,
      );
    }

    const { data: metricsRows, error: metricsError } = await supabase.rpc("get_partner_metrics", {
      p_partner_id: partnerRow.id,
    });
    if (metricsError) {
      throw new Error(`get_partner_metrics RPC failed: ${metricsError.message}`);
    }
    const metrics = metricsRows?.[0] ?? {
      referral_count: 0,
      paid_clients_count: 0,
      pending_reward_usd: 0,
      available_reward_usd: 0,
      lifetime_reward_usd: 0,
    };

    return {
      id: partnerRow.id,
      userId: partnerRow.user_id,
      referralCode: partnerRow.referral_code,
      referralLink: referralLinkFor(partnerRow.referral_code),
      referralCount: Number(metrics.referral_count),
      paidClientsCount: Number(metrics.paid_clients_count),
      // Placeholder — services/partner.service.ts resolves the real level
      // (and overrides commissionRate) via utils/level-calculator, using
      // paidClientsCount/isFoundingPartner above, so this repository
      // doesn't need to duplicate that business rule in JS (it's ALSO
      // duplicated once already, unavoidably, in
      // 0016's partner_commission_rate() SQL function — see that
      // function's comment for why).
      currentLevel: "bronze",
      commissionRate: 0.05,
      isFoundingPartner: partnerRow.is_founding_partner,
      foundingPartnerNumber: partnerRow.founding_partner_number ?? undefined,
      rewardBalance: {
        pendingUsd: Number(metrics.pending_reward_usd),
        availableUsd: Number(metrics.available_reward_usd),
        lifetimeUsd: Number(metrics.lifetime_reward_usd),
      },
      createdAt: partnerRow.created_at,
    };
  },

  async findReferralsByPartnerId(supabase, partnerId) {
    const { data, error } = await supabase.rpc("get_partner_referral_activity", {
      p_partner_id: partnerId,
    });
    if (error) {
      throw new Error(`get_partner_referral_activity RPC failed: ${error.message}`);
    }

    return (data ?? []).map(
      (row: {
        referral_id: string;
        referred_name: string | null;
        order_status: string | null;
        reward_usd: number | string | null;
        created_at: string;
      }): Referral => {
        const rewardUsd = Number(row.reward_usd ?? 0);
        return {
          id: row.referral_id,
          partnerId,
          referredName: row.referred_name ?? "Nimia Client",
          status: deriveReferralStatus(row.order_status, rewardUsd),
          rewardUsd,
          createdAt: row.created_at,
        };
      },
    );
  },

  async getFoundingProgramStatus(supabase) {
    const { count, error } = await supabase
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_partner", true);

    if (error) {
      throw new Error(`Founding partner count query failed: ${error.message}`);
    }

    const claimed = count ?? 0;
    return {
      quota: FOUNDING_PARTNER_QUOTA,
      claimed,
      isOpen: claimed < FOUNDING_PARTNER_QUOTA,
    };
  },
};
