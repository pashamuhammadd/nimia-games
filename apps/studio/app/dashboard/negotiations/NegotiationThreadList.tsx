"use client";

import { motion } from "framer-motion";
import { cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";

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
      {threads.map((thread, index) => {
        const meta = orderStatusMeta(thread.status);
        return (
          <motion.div
            key={thread.orderId}
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
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Agreed Price
                </p>
                <p className="text-base font-bold text-white">
                  ${thread.finalPriceUsd.toLocaleString("en-US")}
                </p>
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
