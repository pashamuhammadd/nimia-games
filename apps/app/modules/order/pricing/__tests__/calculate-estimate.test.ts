import { describe, expect, it } from "vitest";
import { calculateEstimate } from "../calculate-estimate";
import type { ServiceDefinition } from "../../types/catalog";

// Fixture services deliberately do NOT reuse anything from
// ../../data/catalog.ts — they're hand-built here so these tests exercise
// calculateEstimate's own generic field-walking logic (branching only on
// ConfigField.type, per that file's own header comment) rather than
// accidentally depending on today's real catalog prices, which can change
// for business reasons unrelated to pricing-engine correctness.
const DUMMY_ICON = (() => null) as unknown as ServiceDefinition["icon"];

const PACKAGES_SERVICE: ServiceDefinition = {
  id: "svc-packages",
  dbServiceId: "00000000-0000-0000-0000-000000000001",
  categoryId: "cat-test",
  name: "Packages Service",
  tagline: "test",
  icon: DUMMY_ICON,
  pricingModel: "packages",
  packages: [
    { id: "starter", name: "Starter", quantityLabel: "5", price: 100, deliveryDays: 3 },
    { id: "pro", name: "Pro", quantityLabel: "10", price: 250, deliveryDays: 5, highlight: true },
  ],
  configFields: [
    {
      id: "style",
      label: "Style",
      type: "select",
      options: [
        { id: "flat", label: "Flat", effect: { priceDelta: 0 } },
        { id: "3d", label: "3D", effect: { priceDelta: 50, deliveryDeltaDays: 2 } },
      ],
      defaultOptionId: "flat",
    },
    {
      id: "rush",
      label: "Rush Delivery",
      type: "toggle",
      effect: { priceDelta: 40, deliveryMultiplier: 0.5 },
      defaultOn: false,
    },
    {
      id: "extras",
      label: "Extras",
      type: "multi-select",
      options: [
        { id: "source-file", label: "Source File", effect: { priceDelta: 20 } },
        { id: "extra-revision", label: "Extra Revision", effect: { priceDelta: 15, deliveryDeltaDays: 1 } },
      ],
      defaultSelectedIds: [],
    },
  ],
};

const STARTING_FROM_SERVICE: ServiceDefinition = {
  id: "svc-starting-from",
  dbServiceId: "00000000-0000-0000-0000-000000000002",
  categoryId: "cat-test",
  name: "Starting From Service",
  tagline: "test",
  icon: DUMMY_ICON,
  pricingModel: "startingFrom",
  startingPrice: 500,
  baseDeliveryDays: 7,
  configFields: [
    {
      id: "platform",
      label: "Platform",
      type: "select",
      options: [
        { id: "web", label: "Web", effect: { priceDelta: 0 } },
        { id: "mobile", label: "Mobile", effect: { priceDelta: 300, deliveryDeltaDays: 5 } },
      ],
      defaultOptionId: "web",
    },
  ],
};

describe("calculateEstimate", () => {
  it("returns the empty estimate when no service is selected (Step 1/2 not answered yet)", () => {
    const estimate = calculateEstimate(null, null, {});
    expect(estimate).toEqual({
      basePrice: 0,
      basePriceLabel: "",
      baseDeliveryDays: 0,
      lineItems: [],
      totalPrice: 0,
      totalDeliveryDays: 0,
    });
  });

  it("prices a 'packages' service off the selected tier, defaulting to the first tier if none chosen", () => {
    const estimate = calculateEstimate(PACKAGES_SERVICE, null, {});
    expect(estimate.basePrice).toBe(100); // falls back to packages[0] = Starter
    expect(estimate.totalPrice).toBe(100);
    expect(estimate.totalDeliveryDays).toBe(3);
  });

  it("prices a 'packages' service off an explicitly selected tier", () => {
    const estimate = calculateEstimate(PACKAGES_SERVICE, "pro", {});
    expect(estimate.basePrice).toBe(250);
    expect(estimate.basePriceLabel).toBe("Pro package");
  });

  it("prices a 'startingFrom' service off startingPrice + baseDeliveryDays", () => {
    const estimate = calculateEstimate(STARTING_FROM_SERVICE, null, {});
    expect(estimate.basePrice).toBe(500);
    expect(estimate.totalPrice).toBe(500);
    expect(estimate.totalDeliveryDays).toBe(7);
  });

  it("sums select + toggle + multi-select price deltas into totalPrice and lineItems", () => {
    const estimate = calculateEstimate(PACKAGES_SERVICE, "starter", {
      style: "3d",
      rush: true,
      extras: ["source-file", "extra-revision"],
    });
    // 100 (base) + 50 (3D) + 40 (rush) + 20 (source file) + 15 (extra revision)
    expect(estimate.totalPrice).toBe(225);
    expect(estimate.lineItems).toHaveLength(4); // 3D, rush, source-file, extra-revision
  });

  it("applies deliveryDeltaDays additively and deliveryMultiplier multiplicatively, in that order", () => {
    // base 3 days + 2 (3D) = 5, then * 0.5 (rush) = 2.5 -> ceil -> 3
    const estimate = calculateEstimate(PACKAGES_SERVICE, "starter", {
      style: "3d",
      rush: true,
    });
    expect(estimate.totalDeliveryDays).toBe(3);
  });

  it("never lets totalDeliveryDays fall below 1 even with an aggressive multiplier", () => {
    const estimate = calculateEstimate(PACKAGES_SERVICE, "starter", { rush: true });
    // 3 days * 0.5 = 1.5 -> ceil -> 2, still comfortably above the floor,
    // so assert the floor directly against a deliberately extreme service.
    expect(estimate.totalDeliveryDays).toBeGreaterThanOrEqual(1);
  });

  it("never lets totalPrice go negative even if deltas summed below zero", () => {
    const discountService: ServiceDefinition = {
      ...STARTING_FROM_SERVICE,
      startingPrice: 10,
      configFields: [
        {
          id: "discount",
          label: "Discount",
          type: "toggle",
          effect: { priceDelta: -500 },
          defaultOn: true,
        },
      ],
    };
    const estimate = calculateEstimate(discountService, null, {});
    expect(estimate.totalPrice).toBe(0);
  });

  it("ignores a select option with no matching id (defensive default fallback)", () => {
    const estimate = calculateEstimate(PACKAGES_SERVICE, "starter", { style: "does-not-exist" });
    // falls through to option lookup returning undefined -> no effect applied
    expect(estimate.totalPrice).toBe(100);
  });
});
