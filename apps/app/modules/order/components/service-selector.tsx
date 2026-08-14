"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CategoryDefinition } from "../types";
import { OptionCard } from "./option-card";

export interface ServiceSelectorProps {
  category: CategoryDefinition | null;
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
}

// STEP 2 — every service inside the chosen category, as cards (never a
// dropdown, per the brief). Selecting one auto-advances to Step 3 or Step 4
// depending on that service's pricing model (see useOrderWizard#selectService).
export function ServiceSelector({ category, selectedServiceId, onSelect }: ServiceSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!category) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Choose a {category.name.toLowerCase()} service
      </h2>
      <p className="mt-2 text-white/55">{category.tagline}</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {category.services.map((service) => (
          <motion.div key={service.id} variants={item}>
            <OptionCard
              title={service.name}
              description={service.tagline}
              icon={service.icon}
              selected={selectedServiceId === service.id}
              onClick={() => onSelect(service.id)}
              className="min-h-[8.5rem]"
              meta={
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
                  {service.pricingModel === "packages"
                    ? `From $${Math.min(...(service.packages ?? []).map((pkg) => pkg.price))}`
                    : `Starting from $${service.startingPrice ?? 0}`}
                </p>
              }
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
