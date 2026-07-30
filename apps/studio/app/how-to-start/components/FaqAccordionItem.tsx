"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@nimia/ui";
import type { FaqItem } from "../data";

// Single accordion row for SECTION 4. No Accordion primitive exists yet in
// @nimia/ui (checked packages/ui/src/components — only
// Button/Card/Input/Label/Modal/Select/Textarea), so this is a small local
// implementation rather than reaching for a new dependency for one page.
// Height is animated via Framer Motion's `height: "auto"` support (works
// without manual measurement in this version) rather than a max-height
// hack, so it stays exact for any answer length.
export function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/15">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="text-sm font-semibold sm:text-base">{item.question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--nimia-pink)] transition-transform duration-300 ease-out",
            isOpen ? "rotate-180" : "",
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--nimia-muted)] sm:px-6 sm:pb-6">
              {item.answer}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
