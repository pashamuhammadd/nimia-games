// Animation Validation (16 Agustus 2026, Fase 5 of the Order/Payment/
// Invoice/Creative Agent refactor — see FASE0-AUDIT.md section E). Single
// source of truth for the category id that triggers Animation-only
// required fields (Script, Character Reference Images, mandatory Deadline),
// shared between client-side gating (state/use-order-wizard.ts's canGoNext)
// and server-side re-validation (state/submit-order-action.ts,
// state/submit-custom-order-action.ts) so the two never drift apart into
// checking two different strings.
//
// Matches data/categories/animation.ts's ANIMATION_CATEGORY.id exactly —
// see that file (CategoryDefinition.id: "animation") for the taxonomy this
// belongs to. Deliberately NOT related to BundleCategory
// ("web3"/"game"/"website", data/bundle-packages.ts), the unrelated
// taxonomy the "packages"/Bundle order flow uses — there is no "animation"
// bundle category, which is why that flow is explicitly out of scope for
// this validation (a bundle order's isAnimationOrder is always false).
export const ANIMATION_CATEGORY_ID = "animation";

/** project-builder: state.categoryId is a single id. */
export function isAnimationCategoryId(categoryId: string | null | undefined): boolean {
  return categoryId === ANIMATION_CATEGORY_ID;
}

/** custom order: any one of the selected services can be Animation — the
 * requirement applies to the whole order (one Script field, one Character
 * Reference zone) the moment at least one selection is Animation, per the
 * plan agreed during Fase 5 research (a per-line-item split would need a
 * per-service brief, which the Custom Order Builder doesn't have today). */
export function hasAnimationSelection(categoryIds: Array<string | null | undefined>): boolean {
  return categoryIds.some((id) => id === ANIMATION_CATEGORY_ID);
}
