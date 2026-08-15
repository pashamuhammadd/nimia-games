import { describe, expect, it } from "vitest";
import { calculateBundleEstimate } from "../calculate-bundle-estimate";
import type { BundlePackage } from "../../types/bundle";

const DUMMY_ICON = (() => null) as unknown as BundlePackage["icon"];

const PACKAGE: BundlePackage = {
  id: "web3-launch",
  name: "Web3 Launch Package",
  category: "web3",
  price: 999,
  description: "test",
  icon: DUMMY_ICON,
  includedItems: [{ label: "Landing Page" }],
  creativeSlotCount: 2,
  creativeSlotLabel: "Choose 2 Creative Contents",
  creativeOptions: [{ id: "gif", label: "GIF", slots: 1 }],
  freeRevisions: 2,
  estimatedDeliveryLabel: "7–10 business days",
};

describe("calculateBundleEstimate", () => {
  it("returns the empty estimate when no package is selected", () => {
    const estimate = calculateBundleEstimate(null);
    expect(estimate.totalPrice).toBe(0);
    expect(estimate.deliveryLabel).toBeUndefined();
  });

  it("prices a bundle at its single fixed price — never double-charges for creative content slots", () => {
    const estimate = calculateBundleEstimate(PACKAGE);
    expect(estimate.basePrice).toBe(999);
    expect(estimate.totalPrice).toBe(999);
    expect(estimate.lineItems).toEqual([]); // no per-slot lineItems, per this fn's own header comment
  });

  it("surfaces the package's estimatedDeliveryLabel as deliveryLabel instead of a computed day count", () => {
    const estimate = calculateBundleEstimate(PACKAGE);
    expect(estimate.deliveryLabel).toBe("7–10 business days");
    expect(estimate.totalDeliveryDays).toBe(0); // deliberately unused when deliveryLabel is present
  });
});
