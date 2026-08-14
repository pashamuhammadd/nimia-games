"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";

// Custom Order Builder (12 Agustus 2026) — reads the admin-configurable
// installment fee percentage (packages/db/migrations/0038's
// `installment_settings` table, public-readable by design so a visitor
// configuring an order can see the real number before ever submitting
// anything) so Step "custom-payment" can show a live "+30% flexibility fee"
// preview. Falls back to 30 (the DB column's own default) if the read ever
// fails for any reason — never blocks the wizard from rendering the Payment
// Method step over a transient read error; the AUTHORITATIVE number is
// still always re-read server-side again at submit time
// (submitCustomOrderAction), this is preview-only.
export async function getInstallmentFeePercentageAction(): Promise<number> {
  try {
    const supabase = createServerClient(await cookies());
    const { data, error } = await supabase
      .from("installment_settings")
      .select("fee_percentage")
      .eq("id", true)
      .single();
    if (error || !data) return 30;
    return Number(data.fee_percentage);
  } catch {
    return 30;
  }
}
