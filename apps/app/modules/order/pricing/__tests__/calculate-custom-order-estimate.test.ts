import { describe, expect, it, vi } from "vitest";
import type { ServiceDefinition, CategoryDefinition } from "../../types/catalog";

// calculateCustomOrderEstimate looks services/categories up via
// ../data/catalog.ts's getCategory/findServiceById, which in the real app
// resolve against the full 4-category catalog (apps/app/modules/order/data/
// categories/*.ts). Mocking that module here — rather than importing the
// real catalog — keeps this suite testing calculateCustomOrderEstimate's own
// summation/fee logic in isolation from the catalog's actual content, which
// changes for business reasons (new services, price changes) unrelated to
// whether the summing/fee math is correct. Real-catalog integration is
// exercised manually via the live wizard; see the delivered test report for
// what that manual pass should cover.
const DUMMY_ICON = (() => null) as unknown as ServiceDefinition["icon"];

const SERVICE_A: ServiceDefinition = {
  id: "svc-a",
  dbServiceId: "00000000-0000-0000-0000-000000000010",
  categoryId: "cat-a",
  name: "Service A",
  tagline: "test",
  icon: DUMMY_ICON,
  pricingModel: "startingFrom",
  startingPrice: 200,
  baseDeliveryDays: 5,
  configFields: [],
};

const SERVICE_B: ServiceDefinition = {
  id: "svc-b",
  dbServiceId: "00000000-0000-0000-0000-000000000011",
  categoryId: "cat-a",
  name: "Service B",
  tagline: "test",
  icon: DUMMY_ICON,
  pricingModel: "packages",
  packages: [{ id: "std", name: "Standard", quantityLabel: "1", price: 300, deliveryDays: 10 }],
  configFields: [],
};

const CATEGORY_A: CategoryDefinition = {
  id: "cat-a",
  name: "Category A",
  tagline: "test",
  icon: DUMMY_ICON,
  services: [SERVICE_A, SERVICE_B],
};

vi.mock("../../data/catalog", () => ({
  getCategory: (categoryId: string | null) => (categoryId === "cat-a" ? CATEGORY_A : null),
  findServiceById: (serviceId: string | null) =>
    serviceId === "svc-a" ? SERVICE_A : serviceId === "svc-b" ? SERVICE_B : null,
}));

const { calculateCustomOrderEstimate } = await import("../calculate-custom-order-estimate");

describe("calculateCustomOrderEstimate", () => {
  it("returns the empty estimate with zero selections", () => {
    const estimate = calculateCustomOrderEstimate([], null, 30);
    expect(estimate.subtotal).toBe(0);
    expect(estimate.total).toBe(0);
    expect(estimate.serviceLines).toEqual([]);
  });

  it("sums multiple services' line totals into subtotal, using the SAME calculateEstimate() Project Builder uses", () => {
    const estimate = calculateCustomOrderEstimate(
      [
        { id: "sel-1", categoryId: "cat-a", serviceId: "svc-a", packageId: null, configSelections: {} },
        { id: "sel-2", categoryId: "cat-a", serviceId: "svc-b", packageId: "std", configSelections: {} },
      ],
      null,
      30,
    );
    expect(estimate.subtotal).toBe(500); // 200 + 300
    expect(estimate.serviceLines).toHaveLength(2);
    expect(estimate.serviceLines[0].lineTotal).toBe(200);
    expect(estimate.serviceLines[1].lineTotal).toBe(300);
  });

  it("takes the LONGEST service's delivery days, not the sum — services run in parallel", () => {
    const estimate = calculateCustomOrderEstimate(
      [
        { id: "sel-1", categoryId: "cat-a", serviceId: "svc-a", packageId: null, configSelections: {} }, // 5 days
        { id: "sel-2", categoryId: "cat-a", serviceId: "svc-b", packageId: "std", configSelections: {} }, // 10 days
      ],
      null,
      30,
    );
    expect(estimate.totalDeliveryDays).toBe(10); // max(5, 10), not 15
  });

  it("charges zero installment fee for full_payment (and when payment method is null/undecided)", () => {
    const selections = [{ id: "sel-1", categoryId: "cat-a", serviceId: "svc-a", packageId: null, configSelections: {} }];
    const full = calculateCustomOrderEstimate(selections, "full_payment", 30);
    const undecided = calculateCustomOrderEstimate(selections, null, 30);
    expect(full.installmentFeeAmount).toBe(0);
    expect(full.installmentFeePercentage).toBe(0);
    expect(full.total).toBe(full.subtotal);
    expect(undecided.installmentFeeAmount).toBe(0);
    expect(undecided.total).toBe(undecided.subtotal);
  });

  it("adds the admin-configured fee percentage on top for installments, rounded to cents", () => {
    const selections = [{ id: "sel-1", categoryId: "cat-a", serviceId: "svc-a", packageId: null, configSelections: {} }]; // subtotal 200
    const estimate = calculateCustomOrderEstimate(selections, "installments", 30);
    expect(estimate.installmentFeePercentage).toBe(30);
    expect(estimate.installmentFeeAmount).toBe(60); // 200 * 30%
    expect(estimate.total).toBe(260);
  });

  it("silently skips a selection whose category/service no longer resolves (defensive — catalog is static but selections may be stale)", () => {
    const estimate = calculateCustomOrderEstimate(
      [{ id: "sel-1", categoryId: "cat-does-not-exist", serviceId: "svc-a", packageId: null, configSelections: {} }],
      null,
      30,
    );
    expect(estimate.serviceLines).toEqual([]);
    expect(estimate.subtotal).toBe(0);
  });
});
