"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wallet } from "lucide-react";
import { Button, Input, Label, FieldError, Listbox } from "@nimia/ui";
import { WALLET_NETWORK_OPTIONS } from "@/modules/partners";
import { requestPartnerWithdrawalAction } from "./actions";

// Small client island — same split as SupportTicketForm.tsx
// (app/dashboard/support): the page.tsx around this stays a Server
// Component that fetches the partner's balance, this owns just the
// interactive "pick a network, type an address, submit" bit.
export function WithdrawRewardForm({ availableUsd }: { availableUsd: number }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [walletNetwork, setWalletNetwork] = React.useState("solana");
  const [walletAddress, setWalletAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<number | null>(null);

  if (success !== null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-6 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-white">
            Withdrawal request sent — ${success.toLocaleString("en-US")}
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-white/50">
            A founder will review it and send the funds to the wallet address you provided. You&apos;ll get a
            notification the moment it&apos;s sent.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard/partners")} className="mt-2">
          Back to Partners
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestPartnerWithdrawalAction({ walletNetwork, walletAddress });
          if (!result.success) {
            setError(result.error);
            return;
          }
          setSuccess(result.amountUsd);
        });
      }}
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium text-white/50">You&apos;re withdrawing</p>
          <p className="mt-0.5 text-xl font-bold text-white">${availableUsd.toLocaleString("en-US")}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="withdraw-network">Network</Label>
        <Listbox
          id="withdraw-network"
          value={walletNetwork}
          onChange={setWalletNetwork}
          options={WALLET_NETWORK_OPTIONS}
          disabled={isPending}
        />
      </div>

      <div>
        <Label htmlFor="withdraw-address">Wallet Address</Label>
        <Input
          id="withdraw-address"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          placeholder="Paste your wallet address"
          disabled={isPending}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1.5 text-xs text-white/40">
          Double-check this address — Nimia Studio sends payouts manually and can&apos;t reverse a transfer sent to
          the wrong address.
        </p>
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" isLoading={isPending} className="self-start">
        Submit Withdrawal Request
      </Button>
    </form>
  );
}
