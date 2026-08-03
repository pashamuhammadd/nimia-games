"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import {
  acceptNegotiationOfferAction,
  rejectNegotiationOfferAction,
  sendClientCounterOfferAction,
  type NegotiationActionResult,
} from "./actions";

export interface NegotiationOffer {
  id: string;
  proposedBy: string;
  amountUsd: number;
  message: string | null;
  createdAt: string;
}

export interface NegotiationThread {
  orderId: string;
  title: string;
  status: string;
  finalPriceUsd: number | null;
  offers: NegotiationOffer[];
}

// Real order_negotiations data (3 Agustus 2026, per user request — this
// page used to always render ComingSoonState). One card per order, offers
// listed oldest-first inside like a chat thread — your own offers align
// right in a crimson-tinted bubble, Nimia Studio's align left in a neutral
// one, same left/right convention as any messaging UI so who-said-what is
// obvious at a glance without re-reading the label every time.
export function NegotiationThreadList({ threads }: { threads: NegotiationThread[] }) {
  return (
    <div className="flex flex-col gap-4">
      {threads.map((thread, index) => (
        <NegotiationThreadCard key={thread.orderId} thread={thread} index={index} />
      ))}
    </div>
  );
}

// Extracted into its own component (rather than inlined in the `.map` above)
// so each thread's Accept/Reject/counter-offer state is scoped to that one
// card via its own hooks, instead of one shared array of state keyed by
// index.
function NegotiationThreadCard({ thread, index }: { thread: NegotiationThread; index: number }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [actionTaken, setActionTaken] = React.useState<string | null>(null);
  const [counterOffer, setCounterOffer] = React.useState("");

  const meta = orderStatusMeta(thread.status);
  const latestOffer = thread.offers[thread.offers.length - 1] ?? null;
  // The ball is in the client's court only while the order is still
  // "negotiating" AND the most recent offer came from Nimia Studio — if the
  // client made the last move, they're waiting on a response, not owed one.
  const canRespond = thread.status === "negotiating" && latestOffer?.proposedBy === "staff";

  function run(action: () => Promise<NegotiationActionResult>, doneMessage: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setActionTaken(doneMessage);
      router.refresh();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{thread.title}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70">
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {thread.offers.map((offer) => {
          const isYours = offer.proposedBy === "client";
          return (
            <div
              key={offer.id}
              className={cn(
                "max-w-[85%] rounded-xl border px-4 py-2.5",
                isYours
                  ? "ml-auto border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10"
                  : "mr-auto border-white/10 bg-white/[0.04]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  {isYours ? "Your offer" : "Nimia Studio"}
                </p>
                <p className="text-xs text-white/35">{formatRelativeTime(offer.createdAt)}</p>
              </div>
              <p className="mt-1 text-base font-bold text-white">
                ${offer.amountUsd.toLocaleString("en-US")}
              </p>
              {offer.message ? <p className="mt-1 text-sm text-white/60">{offer.message}</p> : null}
            </div>
          );
        })}
      </div>

      {thread.finalPriceUsd != null ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Agreed Price</p>
          <p className="text-base font-bold text-white">
            ${thread.finalPriceUsd.toLocaleString("en-US")}
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {actionTaken ? <p className="mt-3 text-sm text-emerald-400">{actionTaken}</p> : null}

      {/* Respond to Nimia Studio's counter offer (3 Agustus 2026, per user
          request — "klien hanya bisa melihat harga tawaran dari tim nimia
          tapi gak bisa nego balik/setuju/nolak"). Only shown when it's
          actually the client's turn to respond, and hidden once an action
          has been taken this session (actionTaken already covers the
          "closed" state — the page's next full load will reflect whatever
          the server now has). */}
      {canRespond && !actionTaken ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.08] pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(
                  () => acceptNegotiationOfferAction(thread.orderId),
                  `Accepted at $${latestOffer!.amountUsd.toLocaleString("en-US")}. Waiting on payment details next.`,
                )
              }
              className="rounded-lg bg-[var(--nimia-crimson)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
            >
              Accept ${latestOffer!.amountUsd.toLocaleString("en-US")} Offer
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => rejectNegotiationOfferAction(thread.orderId), "Order rejected.")}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          <div className="flex max-w-xs items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="text-sm font-semibold text-white/50">$</span>
            <input
              type="number"
              min={1}
              inputMode="decimal"
              placeholder="Send a counter offer"
              value={counterOffer}
              onChange={(event) => setCounterOffer(event.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="button"
              disabled={isPending || !counterOffer.trim()}
              onClick={() => {
                const amount = Number(counterOffer.trim());
                if (!counterOffer.trim() || Number.isNaN(amount) || amount <= 0) {
                  setError("Enter a valid counter offer amount.");
                  return;
                }
                run(() => sendClientCounterOfferAction(thread.orderId, amount), "Counter offer sent.");
              }}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
