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

export interface OrderWizardState {
  step: StepId;
  categoryId: string | null;
  serviceId: string | null;
  packageId: string | null;
  configSelections: ConfigSelections;
  brief: ProjectBrief;
  files: UploadedFileMeta[];
  agreedToTerms: boolean;
  /** Highest step index ever reached — lets ProgressIndicator allow jumping
   * back to any visited step without allowing a forward skip. */
  maxStepIndexReached: number;
}

export const INITIAL_ORDER_STATE: OrderWizardState = {
  step: "category",
  categoryId: null,
  serviceId: null,
  packageId: null,
  configSelections: {},
  brief: EMPTY_BRIEF,
  files: [],
  agreedToTerms: false,
  maxStepIndexReached: 0,
};
