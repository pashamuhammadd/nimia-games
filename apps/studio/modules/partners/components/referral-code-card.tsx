"use client";

import { motion } from "framer-motion";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { cn } from "@nimia/ui";
import { usePartnerCopy } from "../hooks/use-partner";

// Detailed "your code" showcase card — separate from the Copy Referral
// Code button in partner-banner.tsx, which is a quick action. This card is
// the one that actually displays the code value plus its permanence rules,
// per the brief's "REFERRAL CODE" section.
export function ReferralCodeCard({ referralCode }: { referralCode: string }) {
  const { copied, copy } = usePartnerCopy();
  const isCopied = copied === "code";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
    >
      <div>
        <h3 className="text-sm font-semibold text-white/60">Referral Code</h3>
        <p className="mt-2 break-all font-mono text-2xl font-bold tracking-[0.08em] text-white sm:text-3xl">
          {referralCode}
        </p>
      </div>

      <button
        type="button"
        onClick={() => copy("code", referralCode)}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
          isCopied
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/25 hover:bg-white/[0.08]",
        )}
      >
        {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {isCopied ? "Copied" : "Copy Code"}
      </button>

      <div className="flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs text-white/40">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
        <span>Permanent, unique to your account, and cannot be changed once created.</span>
      </div>
    </motion.div>
  );
}
