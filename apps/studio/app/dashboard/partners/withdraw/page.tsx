import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Hourglass, Wallet } from "lucide-react";
import { createServerClient } from "@nimia/db";
import { getPartnerOverview } from "@/modules/partners";
import { WithdrawRewardForm } from "./WithdrawRewardForm";

export const metadata = { title: "Withdraw Reward" };

// Dedicated page for claiming an Available Reward balance (11 Agustus
// 2026, per user decision — "buatkan tombol withdraw dan langsung menuju
// ke halaman khusus untuk mengisi alamat wallet tujuan"). Reached only
// from the Withdraw button on RewardsCard (modules/partners/components) —
// deliberately not in DashboardNav, same "reachable directly, not a top-
// level menu item" treatment app/dashboard/profile already gets.
export default async function WithdrawRewardPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth, same as every other /dashboard/* page — middleware.ts
  // already keeps signed-out visitors out.
  const overview = await getPartnerOverview(supabase, user!.id);
  const { availableUsd } = overview.rewardSummary;
  const openRequest = overview.partner.openWithdrawalRequest;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/partners"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Partners
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">Withdraw Reward</h1>
        <p className="mt-1 text-sm text-white/45">
          Send your Available Reward balance to a wallet you control — a founder reviews every request and sends
          the payout manually.
        </p>
      </div>

      {openRequest ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] px-6 py-10 text-center">
          <Hourglass className="h-8 w-8 text-sky-300" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold text-white">
              ${openRequest.amountUsd.toLocaleString("en-US")} in review
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-white/50">
              You already have a withdrawal request waiting for founder approval. You&apos;ll get a notification the
              moment it&apos;s sent — you can request again once this one is resolved.
            </p>
          </div>
        </div>
      ) : availableUsd <= 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
          <Wallet className="h-8 w-8 text-white/25" aria-hidden="true" />
          <p className="max-w-sm text-sm text-white/50">
            You don&apos;t have an Available Reward balance yet — rewards become available once a referred client&apos;s
            project is completed.
          </p>
        </div>
      ) : (
        <WithdrawRewardForm availableUsd={availableUsd} />
      )}
    </div>
  );
}
