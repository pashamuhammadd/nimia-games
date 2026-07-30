"use client";

import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { FAQS } from "../data";
import { FaqAccordionItem } from "./FaqAccordionItem";

// SECTION 4 — FAQ accordion. Single-open-at-a-time (opening one closes any
// other) rather than every-item-independent, which reads calmer for a list
// this short. First question starts open so the accordion doesn't look
// empty/inert on first paint.
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08, delayChildren: 0.1 },
    },
  };
  const row: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          FAQ
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Frequently Asked Questions
        </h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-12 flex max-w-3xl flex-col gap-3 sm:mt-14"
      >
        {FAQS.map((item, i) => (
          <motion.div key={item.question} variants={row}>
            <FaqAccordionItem
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
