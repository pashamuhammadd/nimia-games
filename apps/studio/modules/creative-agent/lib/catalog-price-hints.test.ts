import { describe, expect, it } from "vitest";
import { buildCatalogPriceHints } from "./catalog-price-hints";
import { ORDER_CATALOG } from "../../order/data/catalog";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor. buildCatalogPriceHints
// feeds Gemini's system instruction directly (see this file's own header
// comment) — if it silently returned an empty string or malformed lines,
// Nimia Creative Agent would either quote nothing or quote garbage
// mid-chat with a real prospective client watching. Kept as a structural/
// invariant test (not pinning the exact current catalog text), since the
// catalog itself (packages, prices) is expected to change over time and a
// snapshot-style test would just be noise on every repricing pass.

describe("buildCatalogPriceHints", () => {
  const hints = buildCatalogPriceHints();
  const lines = hints.split("\n").filter(Boolean);

  it("returns a non-empty string — the live catalog always has at least one priced service", () => {
    expect(hints.length).toBeGreaterThan(0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("every line follows the '- Category / Service: starting from $X' shape with a finite number", () => {
    const linePattern = /^- .+ \/ .+: starting from \$\d+(\.\d+)?$/;
    for (const line of lines) {
      expect(line).toMatch(linePattern);
    }
  });

  it("covers every category in ORDER_CATALOG that has at least one priced service", () => {
    for (const category of ORDER_CATALOG) {
      const hasPricedService = category.services.some((service) => {
        const price =
          service.pricingModel === "packages"
            ? Math.min(...(service.packages ?? []).map((pkg) => pkg.price))
            : service.startingPrice;
        return price != null && Number.isFinite(price);
      });
      if (hasPricedService) {
        expect(hints).toContain(`- ${category.name} / `);
      }
    }
  });

  it("for a packages-priced service, quotes the CHEAPEST package, not an arbitrary one", () => {
    for (const category of ORDER_CATALOG) {
      for (const service of category.services) {
        if (service.pricingModel === "packages" && service.packages?.length) {
          const cheapest = Math.min(...service.packages.map((pkg) => pkg.price));
          expect(hints).toContain(`${category.name} / ${service.name}: starting from $${cheapest}`);
        }
      }
    }
  });

  it("is deterministic — calling it twice in a row returns identical output", () => {
    expect(buildCatalogPriceHints()).toBe(hints);
  });
});
