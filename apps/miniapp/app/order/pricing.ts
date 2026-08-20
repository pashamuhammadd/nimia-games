/** Duration-based estimate for the Mini App's two curated offerings (new,
 * 20 Agustus 2026, per Pasha's "formnya harus ada pilihan detik nya...
 * harus muncul otomatis juga harga estimasinya" request). Deliberately
 * NOT the real `calculateEstimate` engine
 * (apps/app/modules/order/pricing/calculate-estimate.ts) — that walks a
 * full `ServiceDefinition` with category/service/package/config-field
 * data, none of which exists for "Meme Animation" / "Crypto GIFs" (see
 * app/services/page.tsx's own comment: neither is a real
 * `public.services` row or `apps/app/modules/order/data/categories`
 * entry). This is a small, honest, standalone lookup table instead.
 *
 * The numbers themselves are a starting estimate, anchored to the
 * closest real analogues already shipped in
 * apps/app/modules/order/data/categories/animation.ts — Character
 * Animation (10 sec $75, +$75/+$150 cumulative at 20/30 sec) for Meme
 * Animation, and GIF/Sticker's per-unit pricing scaled down to a single
 * short loop for Crypto GIFs — then extended out to 60 sec using the
 * same ~$75-per-10-sec pace those services already use. They are NOT
 * pulled from an authoritative `services` row, because none exists yet
 * for these two curated offerings. Pasha should tune PRICE_TABLES below
 * to match Nimia Studio's real internal rate card whenever that's
 * defined — until then, every place this number is shown is worded as
 * an ESTIMATE, and the negotiation flow below (see order/actions.ts) is
 * exactly how any gap between this guess and the real price gets
 * resolved, never silently presented as final.
 */

export type OfferingKey = "meme" | "gif" | "default";

export const DURATION_OPTIONS = ["10", "20", "30", "40", "50", "60"] as const;
export type DurationSec = (typeof DURATION_OPTIONS)[number];

type PriceTable = Record<DurationSec, number>;

const PRICE_TABLES: Record<OfferingKey, PriceTable> = {
  meme: { "10": 75, "20": 150, "30": 225, "40": 300, "50": 375, "60": 450 },
  gif: { "10": 50, "20": 90, "30": 130, "40": 170, "50": 210, "60": 250 },
  default: { "10": 75, "20": 150, "30": 225, "40": 300, "50": 375, "60": 450 },
};

export function isValidDuration(value: string): value is DurationSec {
  return (DURATION_OPTIONS as readonly string[]).includes(value);
}

export function normalizeOfferingKey(value: string | undefined): OfferingKey {
  return value === "meme" || value === "gif" ? value : "default";
}

/** Always recomputed from `offeringKey` + `durationSec` — a plain lookup,
 * safe to call again server-side (order/actions.ts does exactly that)
 * rather than trusting a client-submitted price number, same posture
 * apps/app's submitOrderAction takes with calculateEstimate. */
export function estimatePriceUsd(offeringKey: string, durationSec: string): number {
  const table = PRICE_TABLES[normalizeOfferingKey(offeringKey)];
  const duration = isValidDuration(durationSec) ? durationSec : "10";
  return table[duration];
}
