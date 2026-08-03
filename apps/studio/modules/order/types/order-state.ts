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

export type StepId = (typeof ORDER_STEPS)[number];

/** Which entry path a visitor picked on /order's new Step 0 ("Choose Order
 * Type", added 3 Agustus 2026, per user request). Deliberately NOT part of
 * ORDER_STEPS/StepId: only "project-builder" hands off into the existing
 * step machine below (category -> service -> ... -> review) exactly as it
 * worked before this change. "packages" and "custom" render their own
 * placeholder screens instead (see components/order-type-selector.tsx and
 * components/order-wizard.tsx's render branch) — kept out of the step
 * machine so Packages/Custom Order can grow into real flows later without
 * touching Project Builder's architecture at all. */
export type OrderType = "project-builder" | "packages" | "custom";

export interface OrderWizardState {
  /** null until Step 0 is answered — see OrderType above. */
  orderType: OrderType | null;
  step: StepId;
  categoryId: string | null;
  serviceId: string | null;
  packageId: string | null;
  configSelections: ConfigSelections;
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
  brief: EMPTY_BRIEF,
  files: [],
  agreedToTerms: false,
  negotiationOffer: "",
  maxStepIndexReached: 0,
};
