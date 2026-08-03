import type { ConfigField, ConfigSelectOption, ConfigEffect } from "../types";

// Small factory functions — NOT components — that build ConfigField objects.
// Every category data file (./categories/*.ts) composes a service's
// configFields purely by calling these, so the same "Express Delivery"
// toggle, the same "N units" quantity picker, etc. read identically (in
// price/delivery math and in the UI, since ConfigurationBuilder only ever
// switches on `type`) everywhere they're used, instead of being redefined
// ad hoc per service.

export function selectField(field: {
  id: string;
  label: string;
  helpText?: string;
  options: ConfigSelectOption[];
  defaultOptionId?: string;
}): ConfigField {
  return { type: "select", ...field };
}

export function toggleField(field: {
  id: string;
  label: string;
  helpText?: string;
  defaultOn?: boolean;
  effect?: ConfigEffect;
}): ConfigField {
  return { type: "toggle", ...field };
}

export function multiSelectField(field: {
  id: string;
  label: string;
  helpText?: string;
  options: ConfigSelectOption[];
  defaultSelectedIds?: string[];
}): ConfigField {
  return { type: "multi-select", ...field };
}

/**
 * A "pick a quantity" field (Characters, Extra Pages, Screens, …) rendered
 * as a select but generated from a numeric range instead of hand-written
 * options. `included` units are already covered by the base price; every
 * unit past that adds `pricePerExtraUnit` / `deliveryDaysPerExtraUnit`.
 */
export function countField(field: {
  id: string;
  label: string;
  helpText?: string;
  min: number;
  max: number;
  unitLabel: string;
  included?: number;
  pricePerExtraUnit?: number;
  deliveryDaysPerExtraUnit?: number;
  defaultCount?: number;
}): ConfigField {
  const included = field.included ?? field.min;
  const pricePerExtraUnit = field.pricePerExtraUnit ?? 0;
  const deliveryDaysPerExtraUnit = field.deliveryDaysPerExtraUnit ?? 0;

  const options: ConfigSelectOption[] = [];
  for (let count = field.min; count <= field.max; count += 1) {
    const extraUnits = Math.max(0, count - included);
    const hasEffect = extraUnits > 0 && (pricePerExtraUnit !== 0 || deliveryDaysPerExtraUnit !== 0);
    options.push({
      id: String(count),
      label: `${count} ${field.unitLabel}${count === 1 ? "" : "s"}`,
      effect: hasEffect
        ? {
            priceDelta: extraUnits * pricePerExtraUnit,
            deliveryDeltaDays: extraUnits * deliveryDaysPerExtraUnit || undefined,
          }
        : undefined,
    });
  }

  return {
    type: "select",
    id: field.id,
    label: field.label,
    helpText: field.helpText,
    options,
    defaultOptionId: String(field.defaultCount ?? field.min),
  };
}

/** Rush production — shrinks the delivery estimate proportionally (default:
 * 40% faster) rather than by a fixed day count, for a flat fee. */
export function expressDeliveryToggle(priceDelta = 25, deliveryMultiplier = 0.6): ConfigField {
  return {
    type: "toggle",
    id: "expressDelivery",
    label: "Express Delivery",
    helpText: "Rush production for a significantly faster turnaround.",
    effect: { priceDelta, deliveryMultiplier },
  };
}

export function sourceFileToggle(priceDelta = 15): ConfigField {
  return {
    type: "toggle",
    id: "sourceFile",
    label: "Source File",
    helpText: "Receive the original editable project file alongside the final export.",
    effect: { priceDelta },
  };
}

export function voiceOverToggle(priceDelta = 30, deliveryDeltaDays = 1): ConfigField {
  return {
    type: "toggle",
    id: "voiceOver",
    label: "Voice Over",
    helpText: "Professional voice recording added to your project.",
    effect: { priceDelta, deliveryDeltaDays },
  };
}
