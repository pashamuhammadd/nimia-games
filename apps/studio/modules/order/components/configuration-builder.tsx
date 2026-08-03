"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ConfigSelections, ServiceDefinition } from "../types";
import { SelectFieldControl } from "./fields/select-field-control";
import { ToggleFieldControl } from "./fields/toggle-field-control";
import { MultiSelectFieldControl } from "./fields/multi-select-field-control";

export interface ConfigurationBuilderProps {
  service: ServiceDefinition | null;
  selections: ConfigSelections;
  onChange: (fieldId: string, value: string | boolean | string[]) => void;
}

// STEP 4 — entirely data-driven: this component never knows what
// "Character Animation" or "SaaS" mean, it only ever switches on
// field.type (3 fixed cases). Every service's actual configuration lives
// in ../data/categories/*.ts as plain ConfigField objects — adding a new
// service, or changing an existing one's options, never touches this file.
export function ConfigurationBuilder({ service, selections, onChange }: ConfigurationBuilderProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!service) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Configure your project
      </h2>
      <p className="mt-2 text-white/55">{service.name}: tune the details below.</p>

      <motion.div variants={container} initial="hidden" animate="visible" className="mt-8 flex flex-col gap-4">
        {service.configFields.map((field) => (
          <motion.div key={field.id} variants={item}>
            {field.type === "select" ? (
              <SelectFieldControl
                field={field}
                value={(selections[field.id] as string | undefined) ?? field.defaultOptionId ?? field.options[0]?.id ?? ""}
                onChange={(value) => onChange(field.id, value)}
              />
            ) : field.type === "toggle" ? (
              <ToggleFieldControl
                field={field}
                value={(selections[field.id] as boolean | undefined) ?? field.defaultOn ?? false}
                onChange={(value) => onChange(field.id, value)}
              />
            ) : (
              <MultiSelectFieldControl
                field={field}
                value={(selections[field.id] as string[] | undefined) ?? field.defaultSelectedIds ?? []}
                onChange={(value) => onChange(field.id, value)}
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
