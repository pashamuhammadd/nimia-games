import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { CreateVoucherForm, type ClientOption } from "./CreateVoucherForm";
import { VouchersList, type VoucherRow } from "./VouchersList";

export const metadata = { title: "Vouchers" };

// Admin management page for the Vouchers feature (4 Agustus 2026, P1). Every
// write goes through ./actions.ts, which relies on vouchers_admin_write
// (packages/db/migrations/0021_vouchers.sql) as the real security boundary.
export default async function VouchersPage() {
  const supabase = createServerClient(await cookies());

  const { data: vouchers } = await supabase
    .from("vouchers")
    .select(
      "id, code, discount_percent, source, client_id, max_redemptions, redemptions_count, expires_at, is_active, note, created_at, clients(company_name)",
    )
    .order("created_at", { ascending: false });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, users(full_name, email)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Vouchers</h1>
        <p className="mt-1 text-sm text-white/45">
          Create discount codes for a specific client or a public promo, and manage everything Quests have
          already rewarded automatically.
        </p>
      </div>

      <CreateVoucherForm clients={(clients as any as ClientOption[]) ?? []} />

      <VouchersList vouchers={(vouchers as any as VoucherRow[]) ?? []} />
    </div>
  );
}
