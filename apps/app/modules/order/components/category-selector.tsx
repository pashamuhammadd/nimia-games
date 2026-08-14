"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ORDER_CATALOG } from "../data/catalog";
import { OptionCard } from "./option-card";

export interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}

// STEP 1 — 4 big cards, one per category. Selecting one auto-advances to
// Step 2 (see useOrderWizard#selectCategory) — no "Continue" button here.
export function CategorySelector({ selectedCategoryId, onSelect }: CategorySelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        What are you building?
      </h2>
      <p className="mt-2 text-white/55">Pick a category to start configuring your project.</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {ORDER_CATALOG.map((category) => (
          <motion.div key={category.id} variants={item}>
            <OptionCard
              size="lg"
              title={category.name}
              description={category.tagline}
              icon={category.icon}
              selected={selectedCategoryId === category.id}
              onClick={() => onSelect(category.id)}
              className="min-h-[9.5rem]"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
