import { ORDER_CATALOG } from "../../order/data/catalog";

// Compact "category / service: starting from $X" reference list, built
// from the exact same official catalog the Order Wizard prices against
// (modules/order/data/catalog.ts — NOT modules/order's state/service/
// provider internals, so this stays a plain data import, not the kind of
// cross-module coupling this module's barrel comment warns against).
// Injected into Gemini's system instruction (P9, 13 Agustus 2026) so
// Nimia Creative Agent can offer a ROUGH price range as a courtesy mid-
// chat — see system-prompt.ts's own rule on why this must always be
// caveated as an estimate, never a final quote: a freeform conversation
// was never priced against exact catalog line items the way the Order
// Wizard's `selections` are (see submit-creative-agent-order-action.ts's
// own comment on the same distinction).
//
// Recomputed fresh on every call rather than cached — pure in-memory
// iteration over a small hardcoded array, cheap enough that caching would
// only add complexity for no real benefit, and it stays correct
// automatically if the catalog itself is ever edited.
export function buildCatalogPriceHints(): string {
  const lines: string[] = [];

  for (const category of ORDER_CATALOG) {
    for (const service of category.services) {
      const startingPrice =
        service.pricingModel === "packages"
          ? Math.min(...(service.packages ?? []).map((pkg) => pkg.price))
          : service.startingPrice;

      if (startingPrice == null || !Number.isFinite(startingPrice)) continue;
      lines.push(`- ${category.name} / ${service.name}: starting from $${startingPrice}`);
    }
  }

  return lines.join("\n");
}
