import { describe, expect, it } from "vitest";
import { ANIMATION_CATEGORY_ID, isAnimationCategoryId, hasAnimationSelection } from "../category-requirements";

// Animation Validation (16 Agustus 2026, Fase 5 of the Order/Payment/
// Invoice/Creative Agent refactor — see FASE0-AUDIT.md section E). This is
// the single shared "is this order Animation?" logic both
// state/use-order-wizard.ts's client-side canGoNext gating and
// state/submit-order-action.ts / state/submit-custom-order-action.ts's
// server-side re-validation depend on — a bug here would silently either
// skip the required Script/Character Reference/Deadline checks for a real
// Animation order, or wrongly demand them from an unrelated category.
describe("category-requirements — Animation Validation", () => {
  it("ANIMATION_CATEGORY_ID matches data/categories/animation.ts's ANIMATION_CATEGORY.id", () => {
    expect(ANIMATION_CATEGORY_ID).toBe("animation");
  });

  describe("isAnimationCategoryId (project-builder: single categoryId)", () => {
    it("is true only for the exact 'animation' id", () => {
      expect(isAnimationCategoryId("animation")).toBe(true);
    });

    it("is false for every other category id", () => {
      expect(isAnimationCategoryId("game-development")).toBe(false);
      expect(isAnimationCategoryId("website-development")).toBe(false);
      expect(isAnimationCategoryId("digital-assets")).toBe(false);
    });

    it("is false for null/undefined — a bundle/package order or a not-yet-chosen category", () => {
      expect(isAnimationCategoryId(null)).toBe(false);
      expect(isAnimationCategoryId(undefined)).toBe(false);
    });
  });

  describe("hasAnimationSelection (custom order: N selected categoryIds)", () => {
    it("is true when at least one selection is Animation, regardless of position", () => {
      expect(hasAnimationSelection(["animation"])).toBe(true);
      expect(hasAnimationSelection(["game-development", "animation"])).toBe(true);
      expect(hasAnimationSelection(["animation", "website-development", "digital-assets"])).toBe(true);
    });

    it("is false when no selection is Animation", () => {
      expect(hasAnimationSelection(["game-development", "website-development"])).toBe(false);
    });

    it("is false for an empty selection list (nothing added yet)", () => {
      expect(hasAnimationSelection([])).toBe(false);
    });

    it("tolerates null/undefined entries mixed in without throwing", () => {
      expect(hasAnimationSelection([null, undefined, "animation"])).toBe(true);
      expect(hasAnimationSelection([null, undefined])).toBe(false);
    });
  });
});
