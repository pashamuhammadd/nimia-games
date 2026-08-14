// Shared display formatting for the public-facing pricing UI (landing page
// teaser + /services listing). `services.base_price` is stored as a plain
// IDR numeric (see packages/db/migrations/0008_seed_services.sql) — there's
// no currency field yet, so this assumes IDR. Revisit once Tahap 5's
// USD-denominated crypto payment fields (final_price_usd, etc.) land; that's
// for the actual order/payment amount, not necessarily this catalog price.
export function formatServicePrice(basePrice: number | null | undefined): string {
  if (basePrice === null || basePrice === undefined) {
    return "Custom pricing";
  }
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(basePrice);
  return `Starting from ${formatted}`;
}
