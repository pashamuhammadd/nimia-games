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

  // Fix 10 Agustus 2026: this used to also select users(email), but
  // public.users has no `email` column (only id/role/full_name/avatar_url —
  // see packages/db/migrations/0001_enums_and_users.sql; email only ever
  // lives in Supabase auth.users, which isn't reachable through this
  // client). Selecting a non-existent column makes PostgREST reject the
  // whole query, so `clients` here silently came back null/undefined and
  // the "Assign to" dropdown below always rendered with ONLY the "Public /
  // anyone with the code" option — a client-specific voucher could never
  // actually be created from this form. See CreateVoucherForm.tsx's
  // clientLabel() for the corresponding fallback fix.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, users(full_name)")
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
