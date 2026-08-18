import type { CustomServiceSelection, CustomOrderPaymentMethod, CustomOrderInstallmentPlan } from "./custom-order";

/** A configFields[i].id -> value map. The value's shape depends on that
 * field's `type`: "select" -> option id string, "toggle" -> boolean,
 * "multi-select" -> array of option ids. */
export type ConfigSelections = Record<string, string | boolean | string[]>;

export interface ProjectBrief {
  projectTitle: string;
  projectDescription: string;
  targetPlatform: string;
  referenceLink: string;
  additionalNotes: string;
  /** Animation Validation (16 Agustus 2026, Fase 5 of the Order/Payment/
   * Invoice/Creative Agent refactor — see FASE0-AUDIT.md section E).
   * Required (client- and server-side) whenever the order resolves to the
   * "animation" category (project-builder: state.categoryId === "animation";
   * custom order: any CustomServiceSelection.categoryId === "animation");
   * an empty string for every other category, where it's simply unused.
   * Kept as its own field rather than folded into projectDescription so it
   * has a dedicated required textarea (see components/project-brief-form.tsx)
   * and survives as a distinct, labeled section in the final order
   * description the production team reads (see
   * state/submit-order-action.ts's buildDescription). */
  script: string;
}

// `deadline` (18 Agustus 2026, per user request) — REMOVED as a
// ProjectBrief field / manual date input. The deadline the client used to
// type by hand is now always auto-computed from the order's own delivery
// estimate (see ../pricing/estimate-deadline.ts's computeEstimatedDeadline)
// — the Review step shows it as a read-only "Estimated Delivery" row
// (useOrderWizard's `estimatedDeliveryDate`), and submit-order-action.ts/
// submit-custom-order-action.ts write it server-side, the same
// "server recomputes, never trusts the client" posture pricing itself
// already uses. Removing it from ProjectBriefForm's UI is also this
// feature's step-reduction: one fewer required field on the Brief step,
// on top of Brief+Upload being merged into a single step (see
// ORDER_STEPS/BUNDLE_STEPS/CUSTOM_ORDER_STEPS below).

export const EMPTY_BRIEF: ProjectBrief = {
  projectTitle: "",
  projectDescription: "",
  targetPlatform: "",
  referenceLink: "",
  additionalNotes: "",
  script: "",
};

/** Metadata only — the actual File objects live in useOrderWizard's React
 * state, never in localStorage (Files aren't JSON-serializable, and aren't
 * meant to survive a real navigation like the login redirect anyway). */
export interface UploadedFileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

// "payment" (15 Agustus 2026 — Payment Method step generalized from Custom
// Order Builder to Project Builder too, see components/payment-method-step.tsx
// and PaymentMethodStepProps' own generic `estimate: { subtotal }` shape)
// sits right before "review", same placement rationale CUSTOM_ORDER_STEPS'
// own comment gives for "custom-payment": after every configuration
// decision is made, so the fee preview reflects the client's real total,
// never a placeholder number.
//
// "upload" MERGED into "brief" (18 Agustus 2026, per user request to trim
// the wizard's step count) — ProjectBriefForm and UploadSection now both
// render under the single "brief" step id (see components/order-wizard.tsx),
// instead of two separate Continue-gated screens. Every flow below drops
// one step as a result (Project Builder 8 -> 7, Bundle 6 -> 5, Custom
// Order 6 -> 5). "upload" is no longer a valid StepId at all — see
// state/use-order-wizard.ts's sanitizeRestoredState for how an old
// localStorage save still pointing at "upload" is migrated forward to
// "brief" instead of crashing.
export const ORDER_STEPS = [
  "category",
  "service",
  "package",
  "configure",
  "brief",
  "payment",
  "review",
] as const;

/** Package/Bundle system's own step sequence (10 Agustus 2026) — Browse
 * Packages -> Package Detail (slot selection), then rejoins the exact same
 * "brief" -> "review" steps Project Builder already uses (those
 * components are fully orderType-agnostic, see
 * components/project-brief-form.tsx and components/upload-section.tsx). Kept
 * as its own tuple rather than reusing/extending ORDER_STEPS's "category"/
 * "service"/"package" ids, which have different, now-conflicting semantics
 * for a bundle order (see ../data/bundle-packages.ts). "payment" (15 Agustus
 * 2026, same generalization as ORDER_STEPS above) is shared verbatim — a
 * package has a single fixed price, but that price can still be paid in
 * full or in installments, exactly like everything else. */
export const BUNDLE_STEPS = ["browse", "package-detail", "brief", "payment", "review"] as const;

/** Custom Order Builder's own step sequence (12 Agustus 2026) — reuses
 * "brief"/"review" from ORDER_STEPS verbatim (identical meaning: the same
 * brief+upload combined step, the same final review+submit pattern —
 * exactly how BUNDLE_STEPS above already reuses those same ids), but mints
 * two brand-new ids for the parts that are genuinely different:
 * "custom-services" (Step 1, multi-select across all 4 categories at once
 * — unlike ORDER_STEPS' single-category "category"/"service" pair) and
 * "custom-configure" (Step 2, configuring EVERY selected service in one
 * step — spec's Step 2 "Configure Services" and Step 3 "Additional
 * Options" collapse into this single step, since this catalog's existing
 * ConfigField model already mixes base options and paid add-ons together
 * per service, see ../data/fields.ts's toggleField/countField helpers —
 * Rush Delivery, Source File, Additional Character etc. are already
 * "additional options" in that same list, not a separate concept).
 * Payment Method (spec Step 10) is its own step, "custom-payment",
 * deliberately placed right before Review, after every configuration
 * decision — never earlier, per spec section 10's explicit instruction. */
export const CUSTOM_ORDER_STEPS = [
  "custom-services",
  "custom-configure",
  "brief",
  "custom-payment",
  "review",
] as const;

export type StepId =
  | (typeof ORDER_STEPS)[number]
  | (typeof BUNDLE_STEPS)[number]
  | (typeof CUSTOM_ORDER_STEPS)[number];

/** Which entry path a visitor picked on /order's Step 0 ("Choose Order
 * Type", added 3 Agustus 2026, per user request). Deliberately NOT part of
 * ORDER_STEPS/StepId: only "project-builder" hands off into the original
 * step machine below (category -> service -> ... -> review). "packages"
 * (real flow added 10 Agustus 2026, see components/order-wizard.tsx) hands
 * off into BUNDLE_STEPS instead. "custom" still renders its own placeholder
 * screen — see components/order-type-selector.tsx and
 * components/order-wizard.tsx's render branches. */
export type OrderType = "project-builder" | "packages" | "custom";

export interface OrderWizardState {
  /** null until Step 0 is answered — see OrderType above. */
  orderType: OrderType | null;
  step: StepId;
  categoryId: string | null;
  serviceId: string | null;
  packageId: string | null;
  configSelections: ConfigSelections;
  /** Package/Bundle system (10 Agustus 2026) — id into
   * ../data/bundle-packages.ts's BUNDLE_PACKAGES. Distinct from `packageId`
   * above (that one means "selected Step 3 tier of a pricingModel:'packages'
   * service", e.g. GIF/Sticker's Starter/Standard/Pro) to avoid any
   * ambiguity between the two unrelated "package" concepts. Only meaningful
   * when orderType === "packages". */
  bundlePackageId: string | null;
  /** Selected BundleCreativeOption ids for the current bundlePackageId's
   * slot system. Only meaningful when orderType === "packages". */
  bundleCreativeContentIds: string[];
  /** Custom Order Builder (12 Agustus 2026) — one entry per service the
   * client has added, only meaningful when orderType === "custom". See
   * ./custom-order.ts. */
  customServiceSelections: CustomServiceSelection[];
  /** Pay in Full vs Pay in Installments — chosen at Step "custom-payment"
   * (Custom Order) or "payment" (Project Builder/Package, generalized 15
   * Agustus 2026 — see PaymentMethodStep's own comment for why the same
   * component/state field works for all three), null until then. Renamed
   * from `customPaymentMethod` the same day: nothing about "how do you want
   * to pay" is actually Custom-Order-specific, so a name implying otherwise
   * would have been actively misleading once every orderType started
   * setting it. Meaningful for every orderType now, not "only when
   * orderType === custom" as this field used to be scoped. */
  paymentMethod: CustomOrderPaymentMethod | null;
  /** Which milestone schedule an `installments` order uses (18 Agustus
   * 2026, per user request) — see ./custom-order.ts's
   * CustomOrderInstallmentPlan. Chosen in the SAME step as paymentMethod
   * above (see components/payment-method-step.tsx's three-card layout),
   * never on its own separate step — this does not add a step to any
   * flow. Null whenever paymentMethod isn't "installments" yet/at all;
   * reset to null the moment paymentMethod switches away from
   * "installments" (see useOrderWizard#choosePaymentPlan). */
  installmentPlan: CustomOrderInstallmentPlan | null;
  brief: ProjectBrief;
  files: UploadedFileMeta[];
  /** Animation Validation (16 Agustus 2026, Fase 5) — files uploaded through
   * the dedicated, Animation-only "Character Reference Images" zone (see
   * components/order-wizard.tsx's second <UploadSection> instance), kept
   * entirely separate from the generic `files` array above so the two zones
   * never mix and so `canGoNext`'s "brief" step gate can require at least
   * one entry here specifically when isAnimationOrder is true. Always empty
   * for non-Animation orders. Uploaded to Cloudinary and tagged
   * is_character_reference: true on the order_files row (see
   * 0046_animation_character_reference_files.sql) at submit time, exactly
   * like `files` but with the flag flipped. */
  characterReferenceFiles: UploadedFileMeta[];
  agreedToTerms: boolean;
  /** Kept as a raw string (not a number) so the Review step's input can
   * hold an empty string, a partially-typed value, or invalid text without
   * fighting a controlled numeric input — parsed/validated only at submit
   * time (see useOrderWizard#submit). Round-trips through localStorage
   * just like `brief` does, so an offer typed before the login redirect
   * (Submit Order -> not authenticated -> /login -> back to Review) isn't
   * lost. */
  negotiationOffer: string;
  /** Highest step index ever reached — lets ProgressIndicator allow jumping
   * back to any visited step without allowing a forward skip. */
  maxStepIndexReached: number;
}

export const INITIAL_ORDER_STATE: OrderWizardState = {
  orderType: null,
  step: "category",
  categoryId: null,
  serviceId: null,
  packageId: null,
  configSelections: {},
  bundlePackageId: null,
  bundleCreativeContentIds: [],
  customServiceSelections: [],
  paymentMethod: null,
  installmentPlan: null,
  brief: EMPTY_BRIEF,
  files: [],
  characterReferenceFiles: [],
  agreedToTerms: false,
  negotiationOffer: "",
  maxStepIndexReached: 0,
};
