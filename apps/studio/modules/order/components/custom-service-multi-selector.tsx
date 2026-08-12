"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check } from "lucide-react";
import { ORDER_CATALOG } from "../data/catalog";
import type { CustomServiceSelection } from "../types";
import { OptionCard } from "./option-card";

export interface CustomServiceMultiSelectorProps {
  selections: CustomServiceSelection[];
  onAdd: (categoryId: string, serviceId: string) => void;
  onRemove: (selectionId: string) => void;
}

// Custom Order Builder Step 1 ("custom-services", 12 Agustus 2026) — unlike
// Project Builder's Step 1+2 (one category, then one service, both
// auto-advancing), this renders EVERY category's services at once as a
// multi-select grid: a client can pick Animation AND Web Development AND
// Digital Assets in the same order. Clicking an already-selected card
// removes it instead of advancing — there's no "Continue" auto-trigger here,
// the client explicitly presses Continue (StepNavigation) once they're done
// picking, same pattern as Configure/Brief/Upload elsewhere in this wizard.
export function CustomServiceMultiSelector({ selections, onAdd, onRemove }: CustomServiceMultiSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  function findSelection(categoryId: string, serviceId: string) {
    return selections.find((s) => s.categoryId === categoryId && s.serviceId === serviceId) ?? null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
            Build your custom project
          </h2>
          <p className="mt-2 text-white/55">
            Pick any combination of services across all categories — mix and match freely.
          </p>
        </div>
        {selections.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--nimia-pink)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {selections.length} service{selections.length === 1 ? "" : "s"} selected
          </span>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-10">
        {ORDER_CATALOG.map((category) => (
          <div key={category.id}>
            <div className="flex items-center gap-2.5">
              <category.icon className="h-4.5 w-4.5 text-[var(--nimia-pink)]" aria-hidden="true" />
              <h3 className="nimia-font-display text-lg font-bold text-white">{category.name}</h3>
            </div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {category.services.map((service) => {
                const existing = findSelection(category.id, service.id);
                return (
                  <motion.div key={service.id} variants={item}>
                    <OptionCard
                      title={service.name}
                      description={service.tagline}
                      icon={service.icon}
                      selected={Boolean(existing)}
                      onClick={() =>
                        existing ? onRemove(existing.id) : onAdd(category.id, service.id)
                      }
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
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
