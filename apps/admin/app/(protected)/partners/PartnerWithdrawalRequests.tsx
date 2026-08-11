"use client";

import * as React from "react";
import { Hourglass, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import { Button, Input, cn } from "@nimia/ui";
import { formatRelativeTime } from "../../lib/relativeTime";
import { walletNetworkLabel } from "./wallet-network";
import { approveWithdrawalAction, rejectWithdrawalAction } from "./actions";

export type WithdrawalRequestRow = {
  id: string;
  partner_id: string;
  partner_label: string;
  amount_usd: number;
  wallet_network: string;
  wallet_address: string;
  status: "pending" | "completed" | "rejected";
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
};

function formatUsd(value: number) {
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

// Approve/Reject panel for partner withdrawal requests (11 Agustus 2026,
// migration packages/db/migrations/0033_partner_reward_withdrawals.sql,
// per user decision — "founder mengkonfirmasi withdraw dan langsung
// mengirim saldo dengan manual ke alamat tujuan yang partner ketik"). Any
// admin-tier account can SEE this list (partner_withdrawal_requests' RLS
// is is_admin()-gated, same as the rest of the Partners directory), but
// only a founder can actually act on a request — `isFounder` decides
// whether Approve/Reject render as real buttons or a read-only "Awaiting
// founder approval" note, same posture as the /finance page being
// founder-only.
export function PartnerWithdrawalRequests({
  requests,
  isFounder,
}: {
  requests: WithdrawalRequestRow[];
  isFounder: boolean;
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 10);

  if (requests.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white">Withdrawal Requests</h2>

      {pending.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-6 text-center text-sm text-white/40">
          No withdrawal requests waiting for review.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((request) => (
            <WithdrawalRequestCard key={request.id} request={request} isFounder={isFounder} />
          ))}
        </div>
      )}

      {resolved.length > 0 ? (
        <details className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-white/45">
            Recent history ({resolved.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {resolved.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2 text-xs"
              >
                <span className="text-white/60">{request.partner_label}</span>
                <span className="text-white/40">{formatUsd(request.amount_usd)}</span>
                <span className="text-white/40">{walletNetworkLabel(request.wallet_network)}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-medium",
                    request.status === "completed" ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {request.status === "completed" ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                  )}
                  {request.status === "completed" ? "Sent" : "Rejected"}
                </span>
                <span className="text-white/30">{formatRelativeTime(request.processed_at ?? request.requested_at)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function WithdrawalRequestCard({ request, isFounder }: { request: WithdrawalRequestRow; isFounder: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState<"approve" | "reject" | null>(null);
  const [note, setNote] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function copyAddress() {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(request.wallet_address).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function submit(kind: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "approve"
          ? await approveWithdrawalAction(request.id, note)
          : await rejectWithdrawalAction(request.id, note);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNoteOpen(null);
      setNote("");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Hourglass className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{request.partner_label}</p>
            <p className="mt-0.5 text-xs text-white/45">
              Requested {formatRelativeTime(request.requested_at)} · {walletNetworkLabel(request.wallet_network)}
            </p>
          </div>
        </div>
        <p className="text-lg font-bold text-emerald-300">{formatUsd(request.amount_usd)}</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-white/70">{request.wallet_address}</code>
        <button
          type="button"
          onClick={copyAddress}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-white/50 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>

      {!isFounder ? (
        <p className="text-xs text-white/40">Awaiting founder approval — only a founder account can process this.</p>
      ) : noteOpen ? (
        <div className="flex flex-col gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              noteOpen === "approve" ? "Transaction reference (optional)" : "Reason for declining (shown to partner)"
            }
            disabled={isPending}
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={noteOpen === "reject" ? "destructive" : "primary"}
              isLoading={isPending}
              onClick={() => submit(noteOpen)}
            >
              Confirm {noteOpen === "approve" ? "Sent" : "Reject"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => setNoteOpen(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => setNoteOpen("approve")} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark as Sent
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={() => setNoteOpen("reject")} className="gap-1.5">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
