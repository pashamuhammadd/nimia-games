export type VoucherSource = "admin" | "quest_reward" | "public_promo";

export interface ClientVoucher {
  id: string;
  code: string;
  discountPercent: number;
  source: VoucherSource;
  maxRedemptions: number;
  redemptionsCount: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
}
