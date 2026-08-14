"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ServiceDefinition } from "../types";
import { OptionCard } from "./option-card";

export interface PackageSelectorProps {
  service: ServiceDefinition | null;
  selectedPackageId: string | null;
  onSelect: (packageId: string) => void;
}

// STEP 3 — only rendered for "packages" services (e.g. GIF/Sticker). A
// "startingFrom" service (e.g. Character Animation) skips straight from
// Step 2 to Step 4 — see state/steps.ts#getStepsForService.
export function PackageSelector({ service, selectedPackageId, onSelect }: PackageSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!service || service.pricingModel !== "packages" || !service.packages) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Choose a package
      </h2>
      <p className="mt-2 text-white/55">{service.name}: pick the tier that fits your scope.</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {service.packages.map((pkg) => (
          <motion.div key={pkg.id} variants={item}>
            <OptionCard
              size="lg"
              title={pkg.name}
              description={pkg.quantityLabel}
              badge={pkg.highlight ? "⭐ Most Popular" : undefined}
              selected={selectedPackageId === pkg.id}
              onClick={() => onSelect(pkg.id)}
              className="min-h-[11rem]"
              meta={
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="nimia-gradient-text nimia-font-display text-3xl font-bold">
                    ${pkg.price}
                  </p>
                  <p className="mt-1 text-xs text-white/45">{pkg.deliveryDays}-day delivery</p>
                </div>
              }
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
