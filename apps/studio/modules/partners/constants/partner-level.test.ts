import { describe, expect, it } from "vitest";
import { PARTNER_LEVELS, partnerLevelConfig, nextPartnerLevel } from "./partner-level";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor — apps/studio's half
// of the same duplicated-ladder risk apps/admin's partner-level.test.ts
// covers (see that file's own comment: the Bronze/Silver/Gold/Platinum
// thresholds live in 3 hand-synced places with no shared package to
// import from). This file's own header comment additionally warns that
// `utils/level-calculator.ts` relies on PARTNER_LEVELS staying sorted
// ascending by minPaidClients — worth pinning down explicitly.

describe("PARTNER_LEVELS ordering", () => {
  it("is sorted ascending by minPaidClients, as level-calculator.ts's own comment requires", () => {
    for (let i = 1; i < PARTNER_LEVELS.length; i++) {
      expect(PARTNER_LEVELS[i].minPaidClients).toBeGreaterThan(PARTNER_LEVELS[i - 1].minPaidClients);
    }
  });

  it("has contiguous tiers — each tier's max is exactly one below the next tier's min, no gaps", () => {
    for (let i = 0; i < PARTNER_LEVELS.length - 1; i++) {
      expect(PARTNER_LEVELS[i].maxPaidClients).toBe(PARTNER_LEVELS[i + 1].minPaidClients - 1);
    }
  });

  it("only the top tier (Platinum) is uncapped", () => {
    const capped = PARTNER_LEVELS.slice(0, -1);
    const top = PARTNER_LEVELS[PARTNER_LEVELS.length - 1];
    for (const tier of capped) expect(tier.maxPaidClients).not.toBeNull();
    expect(top.maxPaidClients).toBeNull();
  });
});

describe("partnerLevelConfig", () => {
  it("returns the matching config for every known level", () => {
    for (const config of PARTNER_LEVELS) {
      expect(partnerLevelConfig(config.level)).toEqual(config);
    }
  });
});

describe("nextPartnerLevel", () => {
  it("bronze -> silver -> gold -> platinum", () => {
    expect(nextPartnerLevel("bronze")?.level).toBe("silver");
    expect(nextPartnerLevel("silver")?.level).toBe("gold");
    expect(nextPartnerLevel("gold")?.level).toBe("platinum");
  });

  it("returns null at the top tier (platinum) — no next level to show", () => {
    expect(nextPartnerLevel("platinum")).toBeNull();
  });
});
