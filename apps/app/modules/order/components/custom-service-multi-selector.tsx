"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { ORDER_CATALOG } from "../data/catalog";
import type { CustomServiceSelection } from "../types";
import { OptionCard } from "./option-card";

export interface CustomServiceMultiSelectorProps {
  selections: CustomServiceSelection[];
  onAdd: (categoryId: string, serviceId: string) => void;
  onRemove: (selectionId: string) => void;
}

// Custom Order Builder Step 1 ("custom-services", revised 12 Agustus 2026
// per user feedback — the original version showed every category's
// services at once, which read as an overwhelming wall of cards). Now a
// two-level reveal: the 4 category cards render first, and clicking one
// opens its services below without navigating away, so a client can also
// open a second category afterward and keep adding from there — a Custom
// Order still spans multiple categories, this just avoids showing all of
// them at the same time. Only one category is open at a time (clicking a
// different one closes the previous), matching how a client naturally
// works through the choice: animation first, then move on to web dev, etc.
export function CustomServiceMultiSelector({ selections, onAdd, onRemove }: CustomServiceMultiSelectorProps) {
  const shouldReduceMotion = useReducedMotion();
  const [openCategoryId, setOpenCategoryId] = React.useState<string | null>(null);

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

  function countFor(categoryId: string) {
    return selections.filter((s) => s.categoryId === categoryId).length;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
            Build your custom project
          </h2>
          <p className="mt-2 text-white/55">
            Pick a category to see its services, add as many as you need, then move on to the next category.
          </p>
        </div>
        {selections.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--nimia-pink)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {selections.length} service{selections.length === 1 ? "" : "s"} selected
          </span>
        ) : null}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {ORDER_CATALOG.map((category) => {
          const count = countFor(category.id);
          const isOpen = openCategoryId === category.id;
          return (
            <motion.div key={category.id} variants={item}>
              <OptionCard
                size="lg"
                title={category.name}
                description={category.tagline}
                icon={category.icon}
                selected={isOpen}
                onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                className="min-h-[8.5rem]"
                meta={
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-white/70">
                        {count} selected
                      </span>
                    ) : (
                      <span />
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </div>
                }
              />
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        {openCategoryId ? (
          <motion.div
            key={openCategoryId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              {ORDER_CATALOG.filter((category) => category.id === openCategoryId).map((category) => (
                <div key={category.id}>
                  <p className="text-sm font-semibold text-white/70">
                    What kind of {category.name.toLowerCase()} do you need?
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {category.services.map((service) => {
                      const existing = findSelection(category.id, service.id);
                      return (
                        <OptionCard
                          key={service.id}
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
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
