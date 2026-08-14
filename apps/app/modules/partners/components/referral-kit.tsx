"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Layout, Share2, FileText, type LucideIcon } from "lucide-react";

// Marketing Assets — placeholders for now (brief: "Untuk sementara gunakan
// placeholder"). Buttons are visually complete but disabled + tagged
// "Coming soon" rather than linking to files that don't exist yet, so the
// UI doesn't imply a download that silently fails.
const ASSETS: { label: string; icon: LucideIcon }[] = [
  { label: "Download Logo", icon: ImageIcon },
  { label: "Download Banner", icon: Layout },
  { label: "Download Social Media Kit", icon: Share2 },
  { label: "Download Brand Guidelines", icon: FileText },
];

export function ReferralKit() {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Marketing Assets</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/45">
          Coming soon
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASSETS.map(({ label, icon: Icon }, index) => (
          <motion.button
            key={label}
            type="button"
            disabled
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
            className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm font-medium text-white/40"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </motion.button>
        ))}
      </div>
    </section>
  );
}
