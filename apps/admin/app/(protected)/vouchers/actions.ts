"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";

export type VoucherActionResult = { success: true } | { success: false; error: string };

// Every write below relies on vouchers_admin_write (packages/db/migrations/
// 0021_vouchers.sql), which gates on public.is_admin() — this file is
// convenience/UX, not the security boundary itself (same convention as
// apps/admin/app/(protected)/orders/actions.ts).

export async function createVoucherAction(input: {
  code: string;
  discountPercent: number;
  clientId: string | null;
  maxRedemptions: number;
  expiresAt: string | null;
  note: string | null;
}): Promise<VoucherActionResult> {
  const trimmedCode = input.code.trim();
  if (!trimmedCode) {
    return { success: false, error: "Enter a voucher code." };
  }
  if (!Number.isFinite(input.discountPercent) || input.discountPercent <= 0 || input.discountPercent > 100) {
    return { success: false, error: "Discount must be between 1 and 100." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A personal voucher (client_id set) only ever makes sense as single-use —
  // vouchers_personal_single_use (0021) enforces this at the DB level too,
  // this just avoids a round trip to find that out and echoes it in the UI
  // immediately.
  const maxRedemptions = input.clientId ? 1 : Math.max(1, Math.floor(input.maxRedemptions) || 1);

  const { error } = await supabase.from("vouchers").insert({
    code: trimmedCode,
    discount_percent: input.discountPercent,
    source: "admin",
    client_id: input.clientId,
    max_redemptions: maxRedemptions,
    expires_at: input.expiresAt,
    note: input.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/vouchers");
  return { success: true };
}

export async function setVoucherActiveAction(voucherId: string, isActive: boolean): Promise<VoucherActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("vouchers").update({ is_active: isActive }).eq("id", voucherId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/vouchers");
  return { success: true };
}
