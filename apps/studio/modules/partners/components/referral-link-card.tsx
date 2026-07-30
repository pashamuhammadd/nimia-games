"use client";

import { motion } from "framer-motion";
import { Check, Copy, Info } from "lucide-react";
import { cn } from "@nimia/ui";
import { usePartnerCopy } from "../hooks/use-partner";

// Detailed "your link" showcase card, pairing with ReferralCodeCard —
// see that file's header comment for why this is separate from the quick
// Copy Referral Link button in partner-banner.tsx.
export function ReferralLinkCard({ referralLink }: { referralLink: string }) {
  const { copied, copy } = usePartnerCopy();
  const isCopied = copied === "link";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
    >
      <div>
        <h3 className="text-sm font-semibold text-white/60">Referral Link</h3>
        <p className="mt-2 break-all text-sm font-medium text-white sm:text-base">{referralLink}</p>
      </div>

      <button
        type="button"
        onClick={() => copy("link", referralLink)}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
          isCopied
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/25 hover:bg-white/[0.08]",
        )}
      >
        {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {isCopied ? "Copied" : "Copy Link"}
      </button>

      <div className="flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs text-white/40">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
        <span>Anyone who signs up through this link has your referral code applied automatically.</span>
      </div>
    </motion.div>
  );
}
