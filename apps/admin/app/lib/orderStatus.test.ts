import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_META,
  INSTALLMENT_STATUS_META,
  orderStatusMeta,
  installmentStatusMeta,
} from "./orderStatus";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor — see TESTING.md's
// "Suggested next targets" #2. The exact label/color mapping is a design
// choice, not something worth pinning test-by-test forever, but the
// FALLBACK behavior for a status string outside the known enum matters:
// silently mislabeling a status is a support headache (a status shows up
// blank or wrong), not a crash, so it's easy to ship unnoticed if this
// file's `?? { ... }` fallback branch ever regresses.

describe("orderStatusMeta", () => {
  it("returns the real label/dot for every known public.order_status value", () => {
    for (const status of Object.keys(ORDER_STATUS_META)) {
      expect(orderStatusMeta(status)).toEqual(ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META]);
    }
  });

  it("falls back to the raw string as the label (not a blank/undefined) for an unrecognized status", () => {
    const meta = orderStatusMeta("some_future_status_not_yet_in_the_enum");
    expect(meta.label).toBe("some_future_status_not_yet_in_the_enum");
    expect(meta.dotClass).toBe("bg-slate-400");
  });

  it("does not throw on an empty string", () => {
    expect(() => orderStatusMeta("")).not.toThrow();
  });
});

describe("installmentStatusMeta", () => {
  it("returns the real label/dot for every known public.installment_status value", () => {
    for (const status of Object.keys(INSTALLMENT_STATUS_META)) {
      expect(installmentStatusMeta(status)).toEqual(
        INSTALLMENT_STATUS_META[status as keyof typeof INSTALLMENT_STATUS_META],
      );
    }
  });

  it("falls back to the raw string as the label for an unrecognized installment status", () => {
    const meta = installmentStatusMeta("not_a_real_status");
    expect(meta.label).toBe("not_a_real_status");
    expect(meta.dotClass).toBe("bg-slate-400");
  });
});
