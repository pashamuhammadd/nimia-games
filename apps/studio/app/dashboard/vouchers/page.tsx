import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";
import { createServerClient } from "@nimia/db";
import { VoucherCard, getVoucherOverview } from "@/modules/vouchers";

export const metadata = { title: "Vouchers" };

// Real implementation (4 Agustus 2026, P1 — replaces the ComingSoonState
// placeholder, per user request "jangan menyembunyikan voucher/quests,
// lebih baik voucher/quests dikerjakan sekarang aja"). Server Component,
// per the module architecture rules: only imports from "@/modules/vouchers"
// (the module's root barrel), never reaches into services/repository
// directly.
//
// There's deliberately no "redeem a code" input on THIS page —
// apply_voucher_to_order() (packages/db/migrations/0021_vouchers.sql)
// requires a specific order id to discount, so redemption actually happens
// on an order's Payment tab (see
// apps/studio/app/dashboard/orders/PaymentPanel.tsx), not here. This page
// links there instead of duplicating a redemption box that couldn't
// actually apply anything without an order in context.
export default async function VouchersPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const overview = client ? await getVoucherOverview(supabase, client.id) : { vouchers: [], redeemableCount: 0 };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Vouchers</h1>
        <p className="mt-1 text-sm text-white/45">
          Discount codes assigned to your account — from Nimia Studio, from completing a Quest, or a promo you
          were sent.
        </p>
      </div>

      {overview.vouchers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
          <Ticket className="h-8 w-8 text-white/25" aria-hidden="true" />
          <p className="max-w-sm text-sm text-white/50">
            No vouchers on your account yet. Complete a{" "}
            <Link href="/dashboard/quests" className="text-[var(--nimia-pink)] hover:underline">
              Quest
            </Link>{" "}
            to earn one, or watch for a promo code from Nimia Studio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.vouchers.map((voucher) => (
            <VoucherCard key={voucher.id} voucher={voucher} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Have a code to redeem?</p>
          <p className="mt-0.5 text-xs text-white/45">
            Enter it on an order that&apos;s awaiting payment — it&apos;ll apply the discount before you send
            payment.
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white sm:self-auto"
        >
          Go to Orders
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
