import type { SupabaseClient } from "@supabase/supabase-js";
import { voucherRepository } from "../repository/voucher.repository";
import type { ClientVoucher } from "../types/voucher";

export interface VoucherOverview {
  vouchers: ClientVoucher[];
  redeemableCount: number;
}

// Takes the caller's already-authenticated Supabase client + their own
// clients.id (not user_id — same convention as getPartnerOverview in
// modules/partners/services/partner.service.ts) — the page resolves that
// once and passes it down, this module has no opinion on auth/session
// handling.
export async function getVoucherOverview(
  supabase: SupabaseClient,
  clientId: string,
): Promise<VoucherOverview> {
  const vouchers = await voucherRepository.findOwnByClientId(supabase, clientId);

  const now = new Date();
  const redeemableCount = vouchers.filter(
    (voucher) =>
      voucher.isActive &&
      voucher.redemptionsCount < voucher.maxRedemptions &&
      (!voucher.expiresAt || new Date(voucher.expiresAt) > now),
  ).length;

  return { vouchers, redeemableCount };
}
