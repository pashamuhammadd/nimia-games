import { describe, expect, it } from "vitest";
import { resolvePartnerLevelDisplay, nextPartnerLevelDisplay } from "./partner-level";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor — see TESTING.md's
// "Suggested next targets" #3. This file's own header comment already
// documents the risk directly: the Bronze/Silver/Gold/Platinum ladder is
// duplicated by necessity in 3 places (this file, apps/studio's
// constants/partner-level.ts, and 0016/0030's SQL
// partner_commission_rate()) with no shared package to import from. A test
// here is the only mechanical guard that THIS copy's behavior — the normal
// ladder, the Founding Partner override, and the 11 Agustus /partners-page
// Gold-floor — doesn't silently drift from what the other two are supposed
// to do.

describe("resolvePartnerLevelDisplay — normal ladder (not founding, not partner-page)", () => {
  it("0-2 paid clients -> Bronze", () => {
    expect(resolvePartnerLevelDisplay(0, false).label).toBe("Bronze");
    expect(resolvePartnerLevelDisplay(2, false).label).toBe("Bronze");
  });

  it("3-6 paid clients -> Silver", () => {
    expect(resolvePartnerLevelDisplay(3, false).label).toBe("Silver");
    expect(resolvePartnerLevelDisplay(6, false).label).toBe("Silver");
  });

  it("7-14 paid clients -> Gold", () => {
    expect(resolvePartnerLevelDisplay(7, false).label).toBe("Gold");
    expect(resolvePartnerLevelDisplay(14, false).label).toBe("Gold");
  });

  it("15+ paid clients -> Platinum, uncapped", () => {
    expect(resolvePartnerLevelDisplay(15, false).label).toBe("Platinum");
    expect(resolvePartnerLevelDisplay(9999, false).label).toBe("Platinum");
  });
});

describe("resolvePartnerLevelDisplay — Founding Partner override", () => {
  it("is ALWAYS Gold regardless of paidClientsCount, even 0", () => {
    expect(resolvePartnerLevelDisplay(0, true).label).toBe("Gold");
  });

  it("stays Gold even for a founding partner who would otherwise be Platinum — override takes priority, checked first", () => {
    expect(resolvePartnerLevelDisplay(20, true).label).toBe("Gold");
  });
});

describe("resolvePartnerLevelDisplay — /partners-page signup Gold floor (migration 0030)", () => {
  it("lifts a Bronze-by-count partner up to Gold when joinedViaPartnerPage is true", () => {
    expect(resolvePartnerLevelDisplay(0, false, true).label).toBe("Gold");
  });

  it("lifts a Silver-by-count partner up to Gold when joinedViaPartnerPage is true", () => {
    expect(resolvePartnerLevelDisplay(4, false, true).label).toBe("Gold");
  });

  it("does NOT downgrade a Platinum partner who also joined via the partner page", () => {
    expect(resolvePartnerLevelDisplay(15, false, true).label).toBe("Platinum");
  });

  it("defaults joinedViaPartnerPage to false when omitted — every pre-11-Agustus call site keeps its old behavior", () => {
    expect(resolvePartnerLevelDisplay(0, false).label).toBe("Bronze");
  });
});

describe("nextPartnerLevelDisplay", () => {
  it("Bronze -> Silver, Silver -> Gold, Gold -> Platinum", () => {
    const bronze = resolvePartnerLevelDisplay(0, false);
    const silver = resolvePartnerLevelDisplay(3, false);
    const gold = resolvePartnerLevelDisplay(7, false);
    expect(nextPartnerLevelDisplay(bronze)?.label).toBe("Silver");
    expect(nextPartnerLevelDisplay(silver)?.label).toBe("Gold");
    expect(nextPartnerLevelDisplay(gold)?.label).toBe("Platinum");
  });

  it("returns null at the top tier (Platinum) — no next level to show", () => {
    const platinum = resolvePartnerLevelDisplay(15, false);
    expect(nextPartnerLevelDisplay(platinum)).toBeNull();
  });
});
