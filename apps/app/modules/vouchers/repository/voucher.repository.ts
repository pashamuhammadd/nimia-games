import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientVoucher } from "../types/voucher";

// ------------------------------------------------------------------
// Data-access layer for the client-facing Vouchers page (4 Agustus 2026,
// migration packages/db/migrations/0021_vouchers.sql). Every method takes
// the caller's already-authenticated Supabase client (from
// `createServerClient(await cookies())`, same convention as
// modules/partners/repository/partner.repository.ts) — RLS
// (vouchers_select_own_or_admin) is what actually restricts this to the
// caller's own client_id, this repository has no special privilege of its
// own.
//
// Public promo codes (client_id null) are deliberately NOT returned here —
// 0021's own comment explains why they're not RLS-browsable at all, only
// usable if you already know the code (entered directly on an order's
// Payment tab, see apps/studio/app/dashboard/orders/payment-actions.ts's
// applyVoucherAction, which calls apply_voucher_to_order() purely by the
// code text, no SELECT needed first).
// ------------------------------------------------------------------

export interface VoucherRepository {
  findOwnByClientId(supabase: SupabaseClient, clientId: string): Promise<ClientVoucher[]>;
}

export const voucherRepository: VoucherRepository = {
  async findOwnByClientId(supabase, clientId) {
    const { data, error } = await supabase
      .from("vouchers")
      .select(
        "id, code, discount_percent, source, max_redemptions, redemptions_count, expires_at, is_active, note, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load vouchers: ${error.message}`);
    }

    return (data ?? []).map(
      (row: {
        id: string;
        code: string;
        discount_percent: number | string;
        source: ClientVoucher["source"];
        max_redemptions: number;
        redemptions_count: number;
        expires_at: string | null;
        is_active: boolean;
        note: string | null;
        created_at: string;
      }): ClientVoucher => ({
        id: row.id,
        code: row.code,
        discountPercent: Number(row.discount_percent),
        source: row.source,
        maxRedemptions: row.max_redemptions,
        redemptionsCount: row.redemptions_count,
        expiresAt: row.expires_at,
        isActive: row.is_active,
        note: row.note,
        createdAt: row.created_at,
      }),
    );
  },
};
