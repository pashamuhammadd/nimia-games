import { getCategory, findServiceById } from "../data/catalog";
import type { CustomServiceSelection, CustomOrderPaymentMethod } from "../types/custom-order";
import { calculateEstimate } from "./calculate-estimate";

export interface CustomOrderServiceLine {
  selectionId: string;
  categoryName: string;
  serviceName: string;
  packageLabel: string | null;
  basePrice: number;
  addOnsTotal: number;
  lineTotal: number;
  deliveryDays: number;
}

export interface CustomOrderEstimate {
  serviceLines: CustomOrderServiceLine[];
  /** Sum of every service line's total — before any installment fee. */
  subtotal: number;
  /** Whatever percentage was passed in (see get_installment_fee_percentage(),
   * packages/db/migrations/0038) — 0 when paymentMethod isn't "installments"
   * yet/at all, so the UI can still render "+0%" gracefully before the
   * client has chosen a payment method. */
  installmentFeePercentage: number;
  installmentFeeAmount: number;
  /** subtotal + installmentFeeAmount. This is the number Custom Order's
   * submit action re-derives and trusts — never a client-sent total (spec
   * section 6/27), same posture as Project Builder's calculateEstimate. */
  total: number;
  /** Longest single service's delivery estimate, not a sum — every selected
   * service is worked on in parallel by the team, not sequentially. */
  totalDeliveryDays: number;
}

const EMPTY_CUSTOM_ORDER_ESTIMATE: CustomOrderEstimate = {
  serviceLines: [],
  subtotal: 0,
  installmentFeePercentage: 0,
  installmentFeeAmount: 0,
  total: 0,
  totalDeliveryDays: 0,
};

/**
 * Multi-service counterpart to calculate-estimate.ts's calculateEstimate() —
 * sums one calculateEstimate() call per selected service (the SAME shared
 * pricing function Project Builder already uses, never duplicated logic)
 * plus the installment flexibility fee on top. Pure and local, same as
 * calculateEstimate — the real trust boundary is that submitCustomOrderAction
 * calls this SAME function again server-side before ever writing a price to
 * `orders`, exactly mirroring submitOrderAction's existing precedent.
 */
export function calculateCustomOrderEstimate(
  selections: CustomServiceSelection[],
  paymentMethod: CustomOrderPaymentMethod | null,
  feePercentage: number,
): CustomOrderEstimate {
  if (selections.length === 0) return EMPTY_CUSTOM_ORDER_ESTIMATE;

  const serviceLines: CustomOrderServiceLine[] = [];
  for (const selection of selections) {
    const category = getCategory(selection.categoryId);
    const service = findServiceById(selection.serviceId);
    if (!category || !service) continue; // defensive — shouldn't happen, catalog is static

    const estimate = calculateEstimate(service, selection.packageId, selection.configSelections);
    const selectedPackage =
      service.pricingModel === "packages"
        ? service.packages?.find((pkg) => pkg.id === selection.packageId) ?? service.packages?.[0] ?? null
        : null;

    serviceLines.push({
      selectionId: selection.id,
      categoryName: category.name,
      serviceName: service.name,
      packageLabel: selectedPackage ? `${selectedPackage.name} (${selectedPackage.quantityLabel})` : null,
      basePrice: estimate.basePrice,
      addOnsTotal: Math.max(0, estimate.totalPrice - estimate.basePrice),
      lineTotal: estimate.totalPrice,
      deliveryDays: estimate.totalDeliveryDays,
    });
  }

  const subtotal = serviceLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const installmentFeeAmount =
    paymentMethod === "installments" ? Math.round((subtotal * feePercentage) / 100 * 100) / 100 : 0;
  const total = Math.round((subtotal + installmentFeeAmount) * 100) / 100;
  const totalDeliveryDays = serviceLines.reduce((max, line) => Math.max(max, line.deliveryDays), 0);

  return {
    serviceLines,
    subtotal,
    installmentFeePercentage: paymentMethod === "installments" ? feePercentage : 0,
    installmentFeeAmount,
    total,
    totalDeliveryDays,
  };
}
