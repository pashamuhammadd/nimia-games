"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";

export type ServiceActionResult = { success: true } | { success: false; error: string };

// Every write below relies on services_admin_write (packages/db/migrations/
// 0006_rls_policies.sql), which gates on public.is_admin() — this file is
// convenience/UX, not the security boundary itself (same convention as
// apps/admin/app/(protected)/vouchers/actions.ts).

export async function setServiceActiveAction(serviceId: string, isActive: boolean): Promise<ServiceActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("services").update({ is_active: isActive }).eq("id", serviceId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/services");
  return { success: true };
}

export async function updateServicePriceAction(
  serviceId: string,
  basePrice: number | null,
): Promise<ServiceActionResult> {
  if (basePrice !== null && (!Number.isFinite(basePrice) || basePrice < 0)) {
    return { success: false, error: "Enter a valid price." };
  }
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("services").update({ base_price: basePrice }).eq("id", serviceId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/services");
  return { success: true };
}
