// Two currencies coexist in this schema on purpose: invoices (migration
// 0005, Tahap 4) are IDR-denominated like the original services catalog,
// while the Tahap 5 negotiation/crypto-payment flow (migration 0013)
// prices everything in USD (docs/ARCHITECTURE.md section 5: "Harga selalu
// dalam USD"). The Finance page shows both, so both formatters live here.

export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
