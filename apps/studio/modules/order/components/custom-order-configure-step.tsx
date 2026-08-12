"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Trash2 } from "lucide-react";
import { getCategory, findServiceById } from "../data/catalog";
import { calculateEstimate } from "../pricing";
import type { CustomServiceSelection } from "../types";
import { ConfigurationBuilder } from "./configuration-builder";
import { OptionCard } from "./option-card";

export interface CustomOrderConfigureStepProps {
  selections: CustomServiceSelection[];
  onRemove: (selectionId: string) => void;
  onUpdateConfig: (selectionId: string, fieldId: string, value: string | boolean | string[]) => void;
  onSetPackageTier: (selectionId: string, packageId: string) => void;
}

// Custom Order Builder Step 2 ("custom-configure", 12 Agustus 2026) — one
// section per service the client added in Step 1, each rendering the EXACT
// same ConfigurationBuilder Project Builder's own Step 4 uses (never a
// second copy of that switch-on-field.type logic). A "packages" service
// (e.g. GIF/Sticker) also gets an inline tier picker here first — spec's
// Step 2 "Configure Services" + Step 3 "Additional Options" + the tier
// choice Project Builder gives its own step all collapse into this single
// step for Custom Order, since a client is already configuring N services
// in a row here; forcing a separate page per concern per service would be
// far more clicks for the same information, not more clarity.
export function CustomOrderConfigureStep({
  selections,
  onRemove,
  onUpdateConfig,
  onSetPackageTier,
}: CustomOrderConfigureStepProps) {
  const shouldReduceMotion = useReducedMotion();

  if (selections.length === 0) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Configure your services
      </h2>
      <p className="mt-2 text-white/55">
        Tune the details for each service you selected — pricing updates live as you go.
      </p>

      <motion.div variants={container} initial="hidden" animate="visible" className="mt-8 flex flex-col gap-6">
        {selections.map((selection) => {
          const category = getCategory(selection.categoryId);
          const service = findServiceById(selection.serviceId);
          if (!category || !service) return null;

          const lineEstimate = calculateEstimate(service, selection.packageId, selection.configSelections);

          return (
            <motion.div
              key={selection.id}
              variants={item}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                    <service.icon className="h-5 w-5 text-[var(--nimia-pink)]" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{category.name}</p>
                    <p className="nimia-font-display text-lg font-bold text-white">{service.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="nimia-gradient-text nimia-font-display text-xl font-bold">
                    ${lineEstimate.totalPrice}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(selection.id)}
                    aria-label={`Remove ${service.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-red-400/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {service.pricingModel === "packages" && service.packages ? (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {service.packages.map((pkg) => (
                    <OptionCard
                      key={pkg.id}
                      size="sm"
                      title={pkg.name}
                      description={pkg.quantityLabel}
                      badge={pkg.highlight ? "⭐ Most Popular" : undefined}
                      selected={selection.packageId === pkg.id}
                      onClick={() => onSetPackageTier(selection.id, pkg.id)}
                      meta={
                        <div className="mt-1 border-t border-white/10 pt-2">
                          <p className="nimia-gradient-text nimia-font-display text-xl font-bold">${pkg.price}</p>
                          <p className="mt-0.5 text-[11px] text-white/45">{pkg.deliveryDays}-day delivery</p>
                        </div>
                      }
                    />
                  ))}
                </div>
              ) : null}

              {service.configFields.length > 0 ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <ConfigurationBuilder
                    service={service}
                    selections={selection.configSelections}
                    onChange={(fieldId, value) => onUpdateConfig(selection.id, fieldId, value)}
                    hideIntro
                  />
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
