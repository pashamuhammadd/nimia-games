import type { CustomServiceSelection, CustomOrderPaymentMethod } from "./custom-order";

/** A configFields[i].id -> value map. The value's shape depends on that
 * field's `type`: "select" -> option id string, "toggle" -> boolean,
 * "multi-select" -> array of option ids. */
export type ConfigSelections = Record<string, string | boolean | string[]>;

export interface ProjectBrief {
  projectTitle: string;
  projectDescription: string;
  targetPlatform: string;
  deadline: string;
  referenceLink: string;
  additionalNotes: string;
}

export const EMPTY_BRIEF: ProjectBrief = {
  projectTitle: "",
  projectDescription: "",
  targetPlatform: "",
  deadline: "",
  referenceLink: "",
  additionalNotes: "",
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

export const ORDER_STEPS = [
  "category",
  "service",
  "package",
  "configure",
  "brief",
  "upload",
  "review",
] as const;

/** Package/Bundle system's own step sequence (10 Agustus 2026) — Browse
 * Packages -> Package Detail (slot selection), then rejoins the exact same
 * "brief" -> "upload" -> "review" steps Project Builder already uses (those
 * three components are fully orderType-agnostic, see
 * components/project-brief-form.tsx and components/upload-section.tsx). Kept
 * as its own tuple rather than reusing/extending ORDER_STEPS's "category"/
 * "service"/"package" ids, which have different, now-conflicting semantics
 * for a bundle order (see ../data/bundle-packages.ts). */
export const BUNDLE_STEPS = ["browse", "package-detail", "brief", "upload", "review"] as const;

/** Custom Order Builder's own step sequence (12 Agustus 2026) — reuses
 * "brief"/"upload"/"review" from ORDER_STEPS verbatim (identical meaning:
 * the same brief form, the same file upload, the same final review+submit
 * pattern — exactly how BUNDLE_STEPS above already reuses those same three
 * ids), but mints two brand-new ids for the parts that are genuinely
 * different: "custom-services" (Step 1, multi-select across all 4
 * categories at once — unlike ORDER_STEPS' single-category "category"/
 * "service" pair) and "custom-configure" (Step 2, configuring EVERY
 * selected service in one step — spec's Step 2 "Configure Services" and
 * Step 3 "Additional Options" collapse into this single step, since this
 * catalog's existing ConfigField model already mixes base options and paid
 * add-ons together per service, see ../data/fields.ts's toggleField/
 * countField helpers — Rush Delivery, Source File, Additional Character
 * etc. are already "additional options" in that same list, not a separate
 * concept). Payment Method (spec Step 10) is its own step, "custom-payment",
 * deliberately placed right before Review, after every configuration
 * decision — never earlier, per spec section 10's explicit instruction. */
export const CUSTOM_ORDER_STEPS = [
  "custom-services",
  "custom-configure",
  "brief",
  "upload",
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
  /** Custom Order Builder — chosen at Step "custom-payment", null until
   * then. Only meaningful when orderType === "custom". */
  customPaymentMethod: CustomOrderPaymentMethod | null;
  brief: ProjectBrief;
  files: UploadedFileMeta[];
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
  customPaymentMethod: null,
  brief: EMPTY_BRIEF,
  files: [],
  agreedToTerms: false,
  negotiationOffer: "",
  maxStepIndexReached: 0,
};
