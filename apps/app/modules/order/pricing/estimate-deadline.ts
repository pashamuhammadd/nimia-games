/**
 * Auto-computed deadline (18 Agustus 2026, per user request) — replaces
 * the old manual "Deadline" date picker on ProjectBriefForm. The client
 * no longer types a date; the system derives one from the same
 * `totalDeliveryDays`/`deliveryLabel` estimate the pricing engine already
 * computes for every order (see calculate-estimate.ts/
 * calculate-custom-order-estimate.ts/calculate-bundle-estimate.ts), on a
 * calendar-day basis (the user's explicit choice — simpler than a
 * business-day calendar, no holiday/weekend table to maintain).
 *
 * Same trust posture as pricing itself: this is a client-side PREVIEW
 * (Review step's "Estimated Delivery" row) — submit-order-action.ts and
 * submit-custom-order-action.ts both recompute this exact same value
 * server-side, from the server's own recomputed delivery-day estimate,
 * before ever writing `orders.deadline`. The client never gets to send a
 * deadline value directly.
 */

/** Adds `deliveryDays` calendar days to `fromDate` and returns a
 * "YYYY-MM-DD" string for the `orders.deadline` (a plain `date` column,
 * see 0003_orders_projects.sql). Always at least 1 day out, matching
 * calculateEstimate's own `Math.max(1, ...)` floor on totalDeliveryDays —
 * a same-day deadline would never be meaningful for a commissioned
 * creative project. */
export function computeEstimatedDeadline(deliveryDays: number, fromDate: Date = new Date()): string {
  const days = Math.max(1, Math.round(deliveryDays));
  const result = new Date(fromDate.getTime());
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

/**
 * Package/Bundle orders don't carry a single computed day count the way
 * Project Builder/Custom Order do (calculateBundleEstimate always returns
 * totalDeliveryDays: 0, showing a human range like "7–10 business days"
 * instead — see calculate-bundle-estimate.ts's own comment). This parses
 * the upper bound out of that label as a reasonable stand-in day count for
 * the deadline calculation, e.g. "7–10 business days" -> 10. An
 * approximation deliberately, not a second business-day calendar: the
 * user's explicit choice was calendar-day basis for the whole feature, so
 * this treats the extracted number as calendar days too rather than
 * trying to convert "business days" into a weekend-aware count.
 * `fallbackDays` covers any future label that doesn't match the pattern
 * (defaults to 14, the middle of this catalog's own range today) rather
 * than throwing or returning 0.
 */
export function parseBundleDeliveryDaysUpperBound(label: string | undefined, fallbackDays = 14): number {
  if (!label) return fallbackDays;
  const rangeMatch = label.match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (rangeMatch) return Number(rangeMatch[2]);
  const singleMatch = label.match(/(\d+)/);
  return singleMatch ? Number(singleMatch[1]) : fallbackDays;
}
