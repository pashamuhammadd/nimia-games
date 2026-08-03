import type { ConfigSelections, ServiceDefinition } from "../types";

export interface EstimateLineItem {
  fieldId: string;
  fieldLabel: string;
  valueLabel: string;
  priceDelta: number;
}

export interface Estimate {
  basePrice: number;
  basePriceLabel: string;
  baseDeliveryDays: number;
  lineItems: EstimateLineItem[];
  totalPrice: number;
  totalDeliveryDays: number;
}

const EMPTY_ESTIMATE: Estimate = {
  basePrice: 0,
  basePriceLabel: "",
  baseDeliveryDays: 0,
  lineItems: [],
  totalPrice: 0,
  totalDeliveryDays: 0,
};

/**
 * Pure, local calculation — no backend, no API, matching the brief for this
 * phase ("Belum perlu backend. Belum perlu API. Belum perlu database.").
 * Walks a service's configFields generically by `type`; it never branches on
 * a specific service or field id, so adding/editing services in
 * ../data/categories/*.ts changes pricing automatically with no code change
 * here.
 */
export function calculateEstimate(
  service: ServiceDefinition | null,
  packageId: string | null,
  selections: ConfigSelections,
): Estimate {
  if (!service) return EMPTY_ESTIMATE;

  let basePrice = 0;
  let basePriceLabel = "Starting from";
  let baseDeliveryDays = service.baseDeliveryDays ?? 0;

  if (service.pricingModel === "packages") {
    const selectedPackage =
      service.packages?.find((pkg) => pkg.id === packageId) ?? service.packages?.[0] ?? null;
    basePrice = selectedPackage?.price ?? 0;
    baseDeliveryDays = selectedPackage?.deliveryDays ?? baseDeliveryDays;
    basePriceLabel = selectedPackage ? `${selectedPackage.name} package` : "Starting from";
  } else {
    basePrice = service.startingPrice ?? 0;
  }

  const lineItems: EstimateLineItem[] = [];
  let priceDeltaTotal = 0;
  let deliveryDeltaTotal = 0;
  let deliveryMultiplier = 1;

  for (const field of service.configFields) {
    if (field.type === "select") {
      const selectedId =
        (selections[field.id] as string | undefined) ??
        field.defaultOptionId ??
        field.options[0]?.id;
      const option = field.options.find((candidate) => candidate.id === selectedId);
      if (!option?.effect) continue;
      if (option.effect.priceDelta) {
        priceDeltaTotal += option.effect.priceDelta;
        lineItems.push({
          fieldId: field.id,
          fieldLabel: field.label,
          valueLabel: option.label,
          priceDelta: option.effect.priceDelta,
        });
      }
      if (option.effect.deliveryDeltaDays) deliveryDeltaTotal += option.effect.deliveryDeltaDays;
      if (option.effect.deliveryMultiplier) deliveryMultiplier *= option.effect.deliveryMultiplier;
    } else if (field.type === "toggle") {
      const isOn = (selections[field.id] as boolean | undefined) ?? field.defaultOn ?? false;
      if (!isOn || !field.effect) continue;
      if (field.effect.priceDelta) {
        priceDeltaTotal += field.effect.priceDelta;
        lineItems.push({
          fieldId: field.id,
          fieldLabel: field.label,
          valueLabel: "On",
          priceDelta: field.effect.priceDelta,
        });
      }
      if (field.effect.deliveryDeltaDays) deliveryDeltaTotal += field.effect.deliveryDeltaDays;
      if (field.effect.deliveryMultiplier) deliveryMultiplier *= field.effect.deliveryMultiplier;
    } else {
      const selectedIds = (selections[field.id] as string[] | undefined) ?? field.defaultSelectedIds ?? [];
      for (const optionId of selectedIds) {
        const option = field.options.find((candidate) => candidate.id === optionId);
        if (!option?.effect) continue;
        if (option.effect.priceDelta) {
          priceDeltaTotal += option.effect.priceDelta;
          lineItems.push({
            fieldId: `${field.id}:${option.id}`,
            fieldLabel: field.label,
            valueLabel: option.label,
            priceDelta: option.effect.priceDelta,
          });
        }
        if (option.effect.deliveryDeltaDays) deliveryDeltaTotal += option.effect.deliveryDeltaDays;
        if (option.effect.deliveryMultiplier) deliveryMultiplier *= option.effect.deliveryMultiplier;
      }
    }
  }

  const totalPrice = Math.max(0, Math.round(basePrice + priceDeltaTotal));
  const totalDeliveryDays = Math.max(
    1,
    Math.ceil((baseDeliveryDays + deliveryDeltaTotal) * deliveryMultiplier),
  );

  return {
    basePrice,
    basePriceLabel,
    baseDeliveryDays,
    lineItems,
    totalPrice,
    totalDeliveryDays,
  };
}
