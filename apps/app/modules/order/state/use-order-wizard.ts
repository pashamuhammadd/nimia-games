"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_BRIEF,
  INITIAL_ORDER_STATE,
  type CategoryDefinition,
  type OrderType,
  type OrderWizardState,
  type ProjectBrief,
  type ServiceDefinition,
  type StepId,
  type UploadedFileMeta,
  type BundlePackage,
  type CustomServiceSelection,
  type CustomOrderPaymentMethod,
  type CustomOrderInstallmentPlan,
} from "../types";
import { getCategory, findServiceById } from "../data/catalog";
import { findBundlePackageById } from "../data/bundle-packages";
import { isAnimationCategoryId, hasAnimationSelection } from "../data/category-requirements";
import {
  calculateEstimate,
  calculateBundleEstimate,
  calculateCustomOrderEstimate,
  applyInstallmentFeePreview,
  computeEstimatedDeadline,
  parseBundleDeliveryDaysUpperBound,
  type Estimate,
  type CustomOrderEstimate,
} from "../pricing";
import { getDefaultSelections } from "./default-selections";
import { getStepsForService, getStepsForBundle, getStepsForCustomOrder } from "./steps";
import { clearOrderState, loadOrderState, saveOrderState } from "./storage";
import { submitOrderAction } from "./submit-order-action";
import { submitCustomOrderAction } from "./submit-custom-order-action";
import { getInstallmentFeePercentagesAction, type InstallmentFeePercentages } from "./get-installment-fee-action";
import { getUploadSignatureAction } from "./get-upload-signature-action";
import { uploadFileToCloudinary } from "./upload-to-cloudinary";

function withStep(state: OrderWizardState, step: StepId, steps: StepId[]): OrderWizardState {
  const index = steps.indexOf(step);
  return {
    ...state,
    step,
    maxStepIndexReached: index > state.maxStepIndexReached ? index : state.maxStepIndexReached,
  };
}

/** How many of a bundle package's creative-content slots are currently
 * used by a set of selected option ids. Shared by canGoNext's validation
 * and toggleBundleCreativeContent's over-cap guard so the two can never
 * disagree about what counts as "full". */
function usedSlotsFor(pkg: BundlePackage | null, selectedOptionIds: string[]): number {
  if (!pkg) return 0;
  return selectedOptionIds.reduce((sum, id) => {
    const option = pkg.creativeOptions.find((candidate) => candidate.id === id);
    return sum + (option?.slots ?? 0);
  }, 0);
}

const BUNDLE_ONLY_STEPS: StepId[] = ["browse", "package-detail"];
const CUSTOM_ORDER_ONLY_STEPS: StepId[] = ["custom-services", "custom-configure", "custom-payment"];

function generateLocalId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random()}`;
}

/** Repairs a raw parse of localStorage against the CURRENT catalog — if a
 * service/category referenced in an old save no longer exists (data file
 * edited since), fall back gracefully instead of crashing the page. */
function sanitizeRestoredState(raw: unknown): OrderWizardState {
  if (!raw || typeof raw !== "object") return INITIAL_ORDER_STATE;
  const candidate = raw as Partial<OrderWizardState>;

  const category = getCategory(candidate.categoryId ?? null);
  if (candidate.categoryId && !category) return INITIAL_ORDER_STATE;

  const service = category ? findServiceById(candidate.serviceId ?? null) : null;
  if (candidate.serviceId && !service) {
    return {
      ...INITIAL_ORDER_STATE,
      // Preserve orderType here too (added 3 Agustus 2026) — without it, a
      // returning Project Builder visitor whose chosen service no longer
      // exists would get bounced all the way back to Step 0 instead of
      // just back to Choose Service.
      orderType: candidate.orderType ?? null,
      categoryId: candidate.categoryId ?? null,
      step: "service",
      maxStepIndexReached: 1,
    };
  }

  let restored: OrderWizardState = {
    ...INITIAL_ORDER_STATE,
    ...candidate,
    brief: { ...EMPTY_BRIEF, ...candidate.brief },
    // Files never round-trip through localStorage (see state/storage.ts) —
    // always start the restored session with an empty list, regardless of
    // what an older save might contain. Same for characterReferenceFiles
    // (Animation Validation, 16 Agustus 2026, Fase 5) — identical reasoning.
    files: [],
    characterReferenceFiles: [],
  };

  // Step count trim (18 Agustus 2026, per user request) — "upload" is no
  // longer a valid StepId (merged into "brief", see ORDER_STEPS/
  // BUNDLE_STEPS/CUSTOM_ORDER_STEPS' own comment in ../types/order-state.ts).
  // A session saved before this change can still have step: "upload" sitting
  // in localStorage — land it on "brief" (where that content now lives)
  // instead of falling through to an unrecognized step id.
  if ((restored.step as string) === "upload") {
    restored = { ...restored, step: "brief" };
  }

  // Package/Bundle system (10 Agustus 2026) — same fallback pattern as the
  // service check above: if the saved bundlePackageId no longer exists in
  // the current BUNDLE_PACKAGES catalog, don't crash the page, just bounce
  // back to Browse Packages instead of Step 0.
  if (restored.orderType === "packages") {
    if (restored.bundlePackageId && !findBundlePackageById(restored.bundlePackageId)) {
      restored = {
        ...restored,
        bundlePackageId: null,
        bundleCreativeContentIds: [],
        step: "browse",
        maxStepIndexReached: 0,
      };
    }
  } else if (restored.orderType === "custom") {
    // Custom Order Builder (12 Agustus 2026) — same defensive re-validation
    // as the bundle branch above: drop any restored selection whose
    // category/service no longer resolves against the current static
    // catalog, rather than letting a stale localStorage entry crash the
    // page. Doesn't bounce all the way back to Step 0 — losing one bad
    // selection while keeping the rest (and the brief/files/step already
    // reached) is a much softer landing than the single-service case above,
    // since there's no single "the" service this flow depends on.
    restored = {
      ...restored,
      customServiceSelections: (restored.customServiceSelections ?? []).filter(
        (selection) => getCategory(selection.categoryId) && findServiceById(selection.serviceId),
      ),
    };
    if (BUNDLE_ONLY_STEPS.includes(restored.step)) {
      restored = { ...restored, step: "custom-services", maxStepIndexReached: 0 };
    }
  } else if (BUNDLE_ONLY_STEPS.includes(restored.step) || CUSTOM_ORDER_ONLY_STEPS.includes(restored.step)) {
    // Corrupted/cross-flow state (shouldn't normally happen) — a bundle- or
    // custom-order-only step id without the matching orderType has nowhere
    // valid to render.
    restored = { ...restored, step: "category", maxStepIndexReached: 0 };
  }

  // Installment plan (18 Agustus 2026) — same "don't trust a stale save"
  // posture as everything else above: a restored paymentMethod that isn't
  // "installments" can never carry a leftover installmentPlan.
  if (restored.paymentMethod !== "installments") {
    restored = { ...restored, installmentPlan: null };
  }

  return restored;
}

/** Which of the Review step's two buttons was used — "submit" accepts the
 * calculated estimate as-is, "negotiate" attaches the client's own counter
 * offer (see ReviewSection's negotiation offer input) for the team to
 * review instead. Drives both what `submit()` validates and which message
 * OrderWizard's success screen shows afterward. */
export type SubmitIntent = "submit" | "negotiate";

export interface UseOrderWizardResult {
  state: OrderWizardState;
  category: CategoryDefinition | null;
  service: ServiceDefinition | null;
  /** Package/Bundle system (10 Agustus 2026) — the currently selected
   * bundle package, looked up from state.bundlePackageId exactly like
   * `service` is looked up from state.serviceId. Null outside the
   * "packages" order type. */
  bundlePackage: BundlePackage | null;
  steps: StepId[];
  currentStepIndex: number;
  estimate: Estimate;
  /** Custom Order Builder (12 Agustus 2026) — the multi-service estimate,
   * only meaningful (non-empty) when orderType === "custom". Kept separate
   * from `estimate` above rather than force-fitting a different shape into
   * the single-service Estimate type Project Builder/Packages already
   * share. */
  customEstimate: CustomOrderEstimate;
  /** Both admin-configurable installment flexibility fee percentages (18
   * Agustus 2026 — replaces the single flat `installmentFeePercentage`,
   * see packages/db/migrations/0051_tiered_installment_plans.sql), fetched
   * once when orderType becomes non-null. Preview only —
   * submitOrderAction/submitCustomOrderAction re-read the real values
   * server-side before ever computing a price that gets saved. */
  installmentFeePercentages: InstallmentFeePercentages;
  /** Estimated delivery, calendar-day basis (18 Agustus 2026, per user
   * request — replaces the old manual Deadline date field). Null until
   * there's enough of an order to estimate from (no service/bundle/custom
   * selection yet). See ../pricing/estimate-deadline.ts. */
  estimatedDeliveryDate: string | null;
  /** Animation Validation (16 Agustus 2026, Fase 5 — see
   * FASE0-AUDIT.md section E). True when the order resolves to the
   * "animation" category: project-builder checks state.categoryId,
   * custom order checks whether ANY selected service is Animation,
   * packages/bundle orders are always false (that flow uses an unrelated
   * category taxonomy, see data/category-requirements.ts's own comment).
   * Drives the extra required Script field on ProjectBriefForm and the
   * extra required "Character Reference Images" UploadSection instance —
   * both live under the single "brief" step since Brief+Upload merged (18
   * Agustus 2026, see canGoNext's own comment below). */
  isAnimationOrder: boolean;
  isHydrated: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitted: boolean;
  submittedIntent: SubmitIntent | null;
  /** Step 0's answer (added 3 Agustus 2026, per user request) — null until
   * chosen, see OrderTypeSelector/order-wizard.tsx's render branch. */
  orderType: OrderType | null;
  selectOrderType: (type: OrderType) => void;
  /** Returns to Step 0 (the "← Back to order type" link on Browse Packages/
   * Custom Order, and available from Category too). */
  resetOrderType: () => void;
  selectCategory: (categoryId: string) => void;
  selectService: (serviceId: string) => void;
  selectPackage: (packageId: string) => void;
  /** Package/Bundle system (10 Agustus 2026) — picking a package on Browse
   * Packages advances straight to Package Detail, same auto-advance pattern
   * as selectCategory/selectService/selectPackage above. */
  selectBundlePackage: (packageId: string) => void;
  /** Toggles one BundleCreativeOption in/out of the current package's
   * selection. A no-op if selecting it would push the running slot total
   * past the package's creativeSlotCount — see usedSlotsFor above; the UI
   * (components/package-detail.tsx) also disables that option so this
   * over-cap guard is defense-in-depth, not the only thing enforcing it. */
  toggleBundleCreativeContent: (optionId: string) => void;
  /** Custom Order Builder — adds a service to the order (a no-op if that
   * exact category+service pair is already present). Seeds configSelections
   * from the service's own declared defaults, same as selectService does
   * for Project Builder. */
  addCustomService: (categoryId: string, serviceId: string) => void;
  removeCustomService: (selectionId: string) => void;
  updateCustomServiceConfig: (selectionId: string, fieldId: string, value: string | boolean | string[]) => void;
  setCustomServicePackageTier: (selectionId: string, packageId: string) => void;
  /** Pay in Full vs Pay in Installments, and — when Installments — which
   * milestone plan (18 Agustus 2026, per user request: the client now
   * picks 2 vs 3 installments themselves, right here, instead of Admin
   * picking it during review). Replaces the old `setPaymentMethod` setter:
   * `plan` is always null for "full_payment", always set for
   * "installments" (the three-card Payment Method step never lets you
   * pick "Installments" without also picking a card, see
   * payment-method-step.tsx). Shared by all three order types — Custom
   * Order's "custom-payment" step and Project Builder/Package's "payment"
   * step both call this same setter. */
  choosePaymentPlan: (method: CustomOrderPaymentMethod, plan: CustomOrderInstallmentPlan | null) => void;
  updateConfigValue: (fieldId: string, value: string | boolean | string[]) => void;
  updateBrief: (patch: Partial<ProjectBrief>) => void;
  updateNegotiationOffer: (value: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  getFile: (id: string) => File | undefined;
  /** Animation Validation (16 Agustus 2026, Fase 5) — same add/remove/get
   * trio as addFiles/removeFile/getFile above, kept as a fully separate
   * set so the "Character Reference Images" zone never mixes with the
   * generic attachments zone (see OrderWizardState.characterReferenceFiles'
   * own comment). */
  addCharacterReferenceFiles: (files: File[]) => void;
  removeCharacterReferenceFile: (id: string) => void;
  getCharacterReferenceFile: (id: string) => File | undefined;
  setAgreedToTerms: (agreed: boolean) => void;
  goToStep: (step: StepId) => void;
  goNext: () => void;
  goBack: () => void;
  submit: (intent: SubmitIntent) => void;
  startOver: () => void;
}

export function useOrderWizard(isAuthenticated: boolean): UseOrderWizardResult {
  const router = useRouter();
  const [state, setState] = React.useState<OrderWizardState>(INITIAL_ORDER_STATE);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [fileBlobs, setFileBlobs] = React.useState<Record<string, File>>({});
  // Animation Validation (16 Agustus 2026, Fase 5) — File objects for the
  // "Character Reference Images" zone, kept in a separate map exactly like
  // `fileBlobs` above is separate from `state.files`, for the same reason
  // (Files aren't JSON-serializable / meant to survive localStorage).
  const [characterFileBlobs, setCharacterFileBlobs] = React.useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedIntent, setSubmittedIntent] = React.useState<SubmitIntent | null>(null);
  // Tiered installment fees (18 Agustus 2026) — defaults match
  // installment_settings' own DB defaults (0051) so the Payment Method
  // step never shows "+0%" during the brief window before the real values
  // have loaded.
  const [installmentFeePercentages, setInstallmentFeePercentages] = React.useState<InstallmentFeePercentages>({
    twoMilestones: 20,
    threeMilestones: 30,
  });

  // Restore a previous session (including one interrupted by the login
  // redirect) exactly once, after mount — reading localStorage during
  // render would desync the server-rendered markup from the client, so
  // this deliberately happens in an effect instead. See state/storage.ts.
  React.useEffect(() => {
    const raw = loadOrderState();
    if (raw) setState(sanitizeRestoredState(raw));
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return; // don't clobber a saved session with the initial state on first paint
    saveOrderState(state);
  }, [state, isHydrated]);

  // Fetch the real (admin-configurable) installment fee percentages once
  // the visitor actually picks an order type, rather than on every /order
  // page load regardless.
  React.useEffect(() => {
    if (!state.orderType) return;
    let cancelled = false;
    getInstallmentFeePercentagesAction().then((fees) => {
      if (!cancelled) setInstallmentFeePercentages(fees);
    });
    return () => {
      cancelled = true;
    };
  }, [state.orderType]);

  const category = getCategory(state.categoryId);
  const service = findServiceById(state.serviceId);
  const bundlePackage = findBundlePackageById(state.bundlePackageId);
  const isBundleOrder = state.orderType === "packages";
  const isCustomOrder = state.orderType === "custom";
  // Animation Validation (16 Agustus 2026, Fase 5) — see
  // UseOrderWizardResult.isAnimationOrder's own comment above.
  const isAnimationOrder = isBundleOrder
    ? false
    : isCustomOrder
      ? hasAnimationSelection(state.customServiceSelections.map((selection) => selection.categoryId))
      : isAnimationCategoryId(state.categoryId);
  const steps = isBundleOrder
    ? getStepsForBundle()
    : isCustomOrder
      ? getStepsForCustomOrder()
      : getStepsForService(service);
  const currentStepIndex = Math.max(0, steps.indexOf(state.step));

  // Active installment fee percentage (18 Agustus 2026) — resolved from
  // whichever plan the client has actually picked, 0 whenever there's no
  // installments plan chosen yet (mirrors the old flat value's own "0 when
  // not applicable" posture). Fed into applyInstallmentFeePreview/
  // calculateCustomOrderEstimate exactly where the old single
  // `installmentFeePercentage` used to go — neither of those functions
  // needed to change, they've always just taken "the percentage to apply".
  const activeInstallmentFeePercentage =
    state.paymentMethod === "installments" && state.installmentPlan
      ? state.installmentPlan === "three_milestones"
        ? installmentFeePercentages.threeMilestones
        : installmentFeePercentages.twoMilestones
      : 0;

  const baseEstimate = isBundleOrder
    ? calculateBundleEstimate(bundlePackage)
    : calculateEstimate(isCustomOrder ? null : service, state.packageId, state.configSelections);
  // Installment fee preview (15 Agustus 2026) — a no-op for Custom Order
  // (isCustomOrder's `estimate` here is never actually read; that flow uses
  // `customEstimate` below instead, which has always had its own fee math)
  // and for every Full Payment order. See applyInstallmentFeePreview's own
  // comment above for why this wraps calculateEstimate/calculateBundleEstimate
  // rather than living inside them.
  const estimate = applyInstallmentFeePreview(baseEstimate, state.paymentMethod, activeInstallmentFeePercentage);
  const customEstimate = calculateCustomOrderEstimate(
    state.customServiceSelections,
    state.paymentMethod,
    activeInstallmentFeePercentage,
  );

  // Estimated delivery (18 Agustus 2026, per user request — auto-computed,
  // replaces the old manual Deadline date field). Uses whichever flow's own
  // delivery-day number applies; bundle orders don't carry one (see
  // calculate-bundle-estimate.ts's own comment), so this parses an upper
  // bound out of the package's human-readable label instead.
  const deliveryDaysForDeadline = isBundleOrder
    ? bundlePackage
      ? parseBundleDeliveryDaysUpperBound(bundlePackage.estimatedDeliveryLabel)
      : null
    : isCustomOrder
      ? customEstimate.serviceLines.length > 0
        ? customEstimate.totalDeliveryDays
        : null
      : service
        ? baseEstimate.totalDeliveryDays
        : null;
  const estimatedDeliveryDate =
    deliveryDaysForDeadline != null ? computeEstimatedDeadline(deliveryDaysForDeadline) : null;

  const selectOrderType = React.useCallback((type: OrderType) => {
    setState((prev) => ({
      ...prev,
      orderType: type,
      step:
        type === "packages"
          ? "browse"
          : type === "project-builder"
            ? "category"
            : type === "custom"
              ? "custom-services"
              : prev.step,
      maxStepIndexReached: 0,
    }));
  }, []);

  const resetOrderType = React.useCallback(() => {
    setState((prev) => ({ ...prev, orderType: null }));
  }, []);

  const selectCategory = React.useCallback((categoryId: string) => {
    setState((prev) => {
      const next: OrderWizardState = {
        ...prev,
        categoryId,
        serviceId: null,
        packageId: null,
        configSelections: {},
      };
      return withStep(next, "service", getStepsForService(null));
    });
  }, []);

  const selectService = React.useCallback((serviceId: string) => {
    setState((prev) => {
      const nextService = findServiceById(serviceId);
      const nextSteps = getStepsForService(nextService);
      const next: OrderWizardState = {
        ...prev,
        serviceId,
        packageId:
          nextService?.pricingModel === "packages" ? nextService.packages?.[0]?.id ?? null : null,
        configSelections: getDefaultSelections(nextService),
      };
      const targetStep: StepId = nextService?.pricingModel === "packages" ? "package" : "configure";
      return withStep(next, targetStep, nextSteps);
    });
  }, []);

  const selectPackage = React.useCallback((packageId: string) => {
    setState((prev) => withStep({ ...prev, packageId }, "configure", steps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const selectBundlePackage = React.useCallback((packageId: string) => {
    setState((prev) =>
      withStep(
        { ...prev, bundlePackageId: packageId, bundleCreativeContentIds: [] },
        "package-detail",
        getStepsForBundle(),
      ),
    );
  }, []);

  const toggleBundleCreativeContent = React.useCallback((optionId: string) => {
    setState((prev) => {
      const pkg = findBundlePackageById(prev.bundlePackageId);
      if (!pkg) return prev;
      const option = pkg.creativeOptions.find((candidate) => candidate.id === optionId);
      if (!option) return prev;

      const isSelected = prev.bundleCreativeContentIds.includes(optionId);
      if (isSelected) {
        return {
          ...prev,
          bundleCreativeContentIds: prev.bundleCreativeContentIds.filter((id) => id !== optionId),
        };
      }

      const used = usedSlotsFor(pkg, prev.bundleCreativeContentIds);
      if (used + option.slots > pkg.creativeSlotCount) return prev; // over cap — see toggleBundleCreativeContent's doc comment
      return { ...prev, bundleCreativeContentIds: [...prev.bundleCreativeContentIds, optionId] };
    });
  }, []);

  const addCustomService = React.useCallback((categoryId: string, serviceId: string) => {
    setState((prev) => {
      const alreadyAdded = prev.customServiceSelections.some(
        (selection) => selection.categoryId === categoryId && selection.serviceId === serviceId,
      );
      if (alreadyAdded) return prev;

      const svc = findServiceById(serviceId);
      const entry: CustomServiceSelection = {
        id: generateLocalId(),
        categoryId,
        serviceId,
        packageId: svc?.pricingModel === "packages" ? svc.packages?.[0]?.id ?? null : null,
        configSelections: getDefaultSelections(svc),
      };
      return { ...prev, customServiceSelections: [...prev.customServiceSelections, entry] };
    });
  }, []);

  const removeCustomService = React.useCallback((selectionId: string) => {
    setState((prev) => ({
      ...prev,
      customServiceSelections: prev.customServiceSelections.filter((selection) => selection.id !== selectionId),
    }));
  }, []);

  const updateCustomServiceConfig = React.useCallback(
    (selectionId: string, fieldId: string, value: string | boolean | string[]) => {
      setState((prev) => ({
        ...prev,
        customServiceSelections: prev.customServiceSelections.map((selection) =>
          selection.id === selectionId
            ? { ...selection, configSelections: { ...selection.configSelections, [fieldId]: value } }
            : selection,
        ),
      }));
    },
    [],
  );

  const setCustomServicePackageTier = React.useCallback((selectionId: string, packageId: string) => {
    setState((prev) => ({
      ...prev,
      customServiceSelections: prev.customServiceSelections.map((selection) =>
        selection.id === selectionId ? { ...selection, packageId } : selection,
      ),
    }));
  }, []);

  // 18 Agustus 2026 (per user request) — replaces the old `setPaymentMethod`.
  // `plan` must be null for "full_payment" and non-null for "installments"
  // — payment-method-step.tsx's three cards each call this with the
  // correct pairing, so this setter just writes through rather than
  // re-validating that pairing itself.
  const choosePaymentPlan = React.useCallback(
    (method: CustomOrderPaymentMethod, plan: CustomOrderInstallmentPlan | null) => {
      setState((prev) => ({ ...prev, paymentMethod: method, installmentPlan: plan }));
    },
    [],
  );

  const updateConfigValue = React.useCallback(
    (fieldId: string, value: string | boolean | string[]) => {
      setState((prev) => ({
        ...prev,
        configSelections: { ...prev.configSelections, [fieldId]: value },
      }));
    },
    [],
  );

  const updateBrief = React.useCallback((patch: Partial<ProjectBrief>) => {
    setState((prev) => ({ ...prev, brief: { ...prev.brief, ...patch } }));
  }, []);

  const updateNegotiationOffer = React.useCallback((value: string) => {
    setState((prev) => ({ ...prev, negotiationOffer: value }));
  }, []);

  const addFiles = React.useCallback((files: File[]) => {
    if (files.length === 0) return;
    const metas: UploadedFileMeta[] = files.map((file) => ({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setFileBlobs((prev) => {
      const next = { ...prev };
      metas.forEach((meta, i) => {
        next[meta.id] = files[i];
      });
      return next;
    });
    setState((prev) => ({ ...prev, files: [...prev.files, ...metas] }));
  }, []);

  const removeFile = React.useCallback((id: string) => {
    setFileBlobs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setState((prev) => ({ ...prev, files: prev.files.filter((file) => file.id !== id) }));
  }, []);

  const getFile = React.useCallback((id: string) => fileBlobs[id], [fileBlobs]);

  // Animation Validation (16 Agustus 2026, Fase 5) — identical logic to
  // addFiles/removeFile/getFile above, targeting characterReferenceFiles/
  // characterFileBlobs instead of files/fileBlobs.
  const addCharacterReferenceFiles = React.useCallback((files: File[]) => {
    if (files.length === 0) return;
    const metas: UploadedFileMeta[] = files.map((file) => ({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setCharacterFileBlobs((prev) => {
      const next = { ...prev };
      metas.forEach((meta, i) => {
        next[meta.id] = files[i];
      });
      return next;
    });
    setState((prev) => ({ ...prev, characterReferenceFiles: [...prev.characterReferenceFiles, ...metas] }));
  }, []);

  const removeCharacterReferenceFile = React.useCallback((id: string) => {
    setCharacterFileBlobs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setState((prev) => ({
      ...prev,
      characterReferenceFiles: prev.characterReferenceFiles.filter((file) => file.id !== id),
    }));
  }, []);

  const getCharacterReferenceFile = React.useCallback(
    (id: string) => characterFileBlobs[id],
    [characterFileBlobs],
  );

  const setAgreedToTerms = React.useCallback((agreed: boolean) => {
    setState((prev) => ({ ...prev, agreedToTerms: agreed }));
  }, []);

  const goToStep = React.useCallback(
    (step: StepId) => {
      setState((prev) => {
        const targetIndex = steps.indexOf(step);
        if (targetIndex === -1 || targetIndex > prev.maxStepIndexReached) return prev;
        return { ...prev, step };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps],
  );

  const goNext = React.useCallback(() => {
    setState((prev) => {
      const index = steps.indexOf(prev.step);
      const nextIndex = index + 1;
      if (nextIndex >= steps.length) return prev;
      return withStep(prev, steps[nextIndex], steps);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const goBack = React.useCallback(() => {
    setState((prev) => {
      const index = steps.indexOf(prev.step);
      const prevIndex = index - 1;
      if (prevIndex < 0) return prev;
      return { ...prev, step: steps[prevIndex] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const canGoNext = React.useMemo(() => {
    // Brief + Upload merged into one step (18 Agustus 2026, per user
    // request to trim the wizard) — this gate now covers both what the old
    // "brief" gate checked AND what the old "upload" gate checked
    // (Character Reference Images for Animation orders). Deadline is no
    // longer part of this check at all — it's auto-computed, never a
    // client-typed field (see estimatedDeliveryDate above).
    if (state.step === "brief") {
      const baseValid =
        state.brief.projectTitle.trim().length > 0 && state.brief.projectDescription.trim().length > 0;
      if (isAnimationOrder) {
        return (
          baseValid &&
          state.brief.script.trim().length > 0 &&
          state.characterReferenceFiles.length > 0
        );
      }
      return baseValid;
    }
    // Package/Bundle system (10 Agustus 2026) — Continue only unlocks once
    // the client has filled every creative-content slot the package grants,
    // exactly matching the count (not "at least"), per the brief.
    if (state.step === "package-detail") {
      if (!bundlePackage) return false;
      return usedSlotsFor(bundlePackage, state.bundleCreativeContentIds) === bundlePackage.creativeSlotCount;
    }
    // Custom Order Builder (12 Agustus 2026) — Select Services needs at
    // least one service added.
    if (state.step === "custom-services") {
      return state.customServiceSelections.length > 0;
    }
    // Payment Method needs an explicit choice (spec section 10 — never
    // defaults to one silently) — "custom-payment" is Custom Order
    // Builder's own step id, "payment" is Project Builder/Package's
    // (generalized 15 Agustus 2026, same underlying `paymentMethod` field
    // either way — see OrderWizardState's own comment). 18 Agustus 2026 —
    // "installments" additionally needs an explicit installmentPlan (2 vs 3)
    // before Continue unlocks, same "never silently default" posture.
    if (state.step === "custom-payment" || state.step === "payment") {
      if (state.paymentMethod === "installments") return state.installmentPlan !== null;
      return state.paymentMethod !== null;
    }
    return true;
  }, [
    state.step,
    state.brief.projectTitle,
    state.brief.projectDescription,
    state.brief.script,
    state.characterReferenceFiles,
    state.bundleCreativeContentIds,
    state.customServiceSelections,
    state.paymentMethod,
    state.installmentPlan,
    bundlePackage,
    isAnimationOrder,
  ]);

  const submit = React.useCallback(
    (intent: SubmitIntent) => {
      if (!state.agreedToTerms) {
        setSubmitError("Please confirm the checklist above before submitting.");
        return;
      }

      if (isCustomOrder && state.customServiceSelections.length === 0) {
        setSubmitError("Add at least one service before submitting.");
        return;
      }
      // Generalized 15 Agustus 2026 from isCustomOrder-only — every order
      // type now has a Payment Method step (see canGoNext's own comment
      // above), so this guard applies regardless of orderType.
      if (!state.paymentMethod) {
        setSubmitError("Choose a payment method before submitting.");
        return;
      }
      // 18 Agustus 2026 — same final-guard pattern as the checks below:
      // canGoNext already gates step-by-step navigation on this, repeated
      // here in case Review was reached via a restored session.
      if (state.paymentMethod === "installments" && !state.installmentPlan) {
        setSubmitError("Choose 2 or 3 installments before submitting.");
        return;
      }

      // Animation Validation (16 Agustus 2026, Fase 5) — same checks
      // canGoNext's "brief" branch already gates step-by-step navigation
      // on, repeated here as a final guard in case Review was reached via a
      // restored (non-authenticated -> /login -> back) session where an
      // earlier step's requirement was met at the time but no longer is
      // (e.g. localStorage brief edited outside the flow).
      // submitOrderAction/submitCustomOrderAction re-validate this
      // server-side too — this is just so a visitor doesn't wait on a round
      // trip to find out. Deadline is no longer part of this check (18
      // Agustus 2026) — it's auto-computed, never client-typed.
      if (isAnimationOrder) {
        if (!state.brief.script.trim()) {
          setSubmitError("Add a script or story before submitting an Animation project.");
          return;
        }
        if (state.characterReferenceFiles.length === 0) {
          setSubmitError("Upload at least one character reference image before submitting an Animation project.");
          return;
        }
      }

      // Negotiating requires an actual number to send the team — "Submit
      // Order" alone (accepting the calculated estimate) has no such
      // requirement. (submitOrderAction/submitCustomOrderAction re-validate
      // this server-side too — this is just so a visitor doesn't wait on a
      // round trip to find out.)
      if (intent === "negotiate") {
        const parsedOffer = Number(state.negotiationOffer.trim());
        if (!state.negotiationOffer.trim() || Number.isNaN(parsedOffer) || parsedOffer <= 0) {
          setSubmitError("Enter the price you'd like to offer before submitting for negotiation.");
          return;
        }
      }

      setSubmitError(null);

      if (!isAuthenticated) {
        // The order draft (everything except attached files) is already kept
        // in sync with localStorage by the effect above, and `state.step` is
        // already "review" at this point — so once signInAction (see
        // app/actions.ts) redirects back to redirectedFrom, this same hook
        // restores straight onto the Review step with everything intact,
        // including whatever offer was typed into the negotiation field.
        // The visitor clicks Submit/Negotiate again themselves once back —
        // this redirect doesn't remember which of the two they'd clicked.
        router.push(`/login?redirectedFrom=${encodeURIComponent("/order")}`);
        return;
      }

      setIsSubmitting(true);

      // Added 4 Agustus 2026 (P0.3 — "file upload order hilang total" dari
      // audit). Everything past this point is authenticated (checked
      // above), so attachments upload straight to Cloudinary here, BEFORE
      // the order itself is created — see get-upload-signature-action.ts
      // and upload-to-cloudinary.ts for why (and why that's safe/scoped
      // per-user). Wrapped in a self-invoked async function since this
      // callback itself can't be declared `async` without changing every
      // caller's expectations (order-wizard.tsx just fires this from an
      // onClick, it never awaits the return value).
      (async () => {
        let uploadedFiles: { name: string; url: string; isCharacterReference?: boolean }[] = [];

        // Animation Validation (16 Agustus 2026, Fase 5) — combine the
        // generic `files` zone with the Animation-only
        // `characterReferenceFiles` zone into one upload pass (one
        // signature fetch, one Promise.all) rather than two, tagging each
        // resulting `order_files` row with isCharacterReference so
        // submit-order-action.ts/submit-custom-order-action.ts can set
        // 0046's new column correctly without any other change to how
        // uploading itself works.
        const combinedMetas: { meta: UploadedFileMeta; isCharacterReference: boolean }[] = [
          ...state.files.map((meta) => ({ meta, isCharacterReference: false })),
          ...state.characterReferenceFiles.map((meta) => ({ meta, isCharacterReference: true })),
        ];

        if (combinedMetas.length > 0) {
          const signatureResult = await getUploadSignatureAction();
          if (!signatureResult.success) {
            setIsSubmitting(false);
            setSubmitError(signatureResult.error);
            return;
          }

          try {
            uploadedFiles = await Promise.all(
              combinedMetas.map(({ meta, isCharacterReference }) => {
                const file = isCharacterReference ? characterFileBlobs[meta.id] : fileBlobs[meta.id];
                if (!file) {
                  // Shouldn't normally happen (removeFile/
                  // removeCharacterReferenceFile keep their meta/blob maps
                  // in sync) — fails loudly instead of silently submitting
                  // an order missing an attachment the client thinks is
                  // still there.
                  throw new Error(`${meta.name} is missing — please remove and re-attach it.`);
                }
                return uploadFileToCloudinary(file, signatureResult).then((uploaded) => ({
                  ...uploaded,
                  isCharacterReference,
                }));
              }),
            );
          } catch (uploadError) {
            setIsSubmitting(false);
            setSubmitError(
              uploadError instanceof Error
                ? uploadError.message
                : "Failed to upload one of your files. Please try again.",
            );
            return;
          }
        }

        // Custom Order Builder (12 Agustus 2026) branches to its own submit
        // action entirely — different shape of input (N services, a payment
        // method) than Project Builder/Packages share. See
        // submit-custom-order-action.ts for the actual insert logic.
        const submission = isCustomOrder
          ? submitCustomOrderAction({
              intent,
              selections: state.customServiceSelections,
              paymentMethod: state.paymentMethod,
              // 18 Agustus 2026 — see SubmitCustomOrderActionInput.installmentPlan's
              // own comment in submit-custom-order-action.ts.
              installmentPlan: state.installmentPlan,
              brief: state.brief,
              negotiationOffer: state.negotiationOffer,
              uploadedFiles,
              agreedToTerms: state.agreedToTerms,
            })
          : submitOrderAction({
              intent,
              categoryId: isBundleOrder ? null : state.categoryId,
              serviceId: isBundleOrder ? null : state.serviceId,
              packageId: isBundleOrder ? null : state.packageId,
              configSelections: isBundleOrder ? {} : state.configSelections,
              bundlePackageId: isBundleOrder ? state.bundlePackageId : null,
              bundleCreativeContentIds: isBundleOrder ? state.bundleCreativeContentIds : [],
              // 15 Agustus 2026 — see SubmitOrderActionInput.paymentMethod's
              // own comment in submit-order-action.ts.
              paymentMethod: state.paymentMethod,
              // 18 Agustus 2026 — see SubmitOrderActionInput.installmentPlan's
              // own comment in submit-order-action.ts.
              installmentPlan: state.installmentPlan,
              brief: state.brief,
              negotiationOffer: state.negotiationOffer,
              uploadedFiles,
              agreedToTerms: state.agreedToTerms,
            });

        submission
          .then((result) => {
            setIsSubmitting(false);
            if (!result.ok) {
              setSubmitError(result.error);
              return;
            }
            setSubmitted(true);
            setSubmittedIntent(intent);
            clearOrderState();
          })
          .catch(() => {
            setIsSubmitting(false);
            setSubmitError("Something went wrong submitting your order. Please try again.");
          });
      })();
    },
    [
      isAuthenticated,
      router,
      isBundleOrder,
      isCustomOrder,
      state.agreedToTerms,
      state.negotiationOffer,
      state.categoryId,
      state.serviceId,
      state.packageId,
      state.configSelections,
      state.bundlePackageId,
      state.bundleCreativeContentIds,
      state.customServiceSelections,
      state.paymentMethod,
      state.installmentPlan,
      state.brief,
      state.files,
      fileBlobs,
      state.characterReferenceFiles,
      characterFileBlobs,
      isAnimationOrder,
    ],
  );

  const startOver = React.useCallback(() => {
    clearOrderState();
    setFileBlobs({});
    setCharacterFileBlobs({});
    setSubmitted(false);
    setSubmittedIntent(null);
    setSubmitError(null);
    setState(INITIAL_ORDER_STATE);
  }, []);

  return {
    state,
    category,
    service,
    bundlePackage,
    steps,
    currentStepIndex,
    estimate,
    customEstimate,
    installmentFeePercentages,
    estimatedDeliveryDate,
    isAnimationOrder,
    isHydrated,
    canGoNext,
    isSubmitting,
    submitError,
    submitted,
    submittedIntent,
    orderType: state.orderType,
    selectOrderType,
    resetOrderType,
    selectCategory,
    selectService,
    selectPackage,
    selectBundlePackage,
    toggleBundleCreativeContent,
    addCustomService,
    removeCustomService,
    updateCustomServiceConfig,
    setCustomServicePackageTier,
    choosePaymentPlan,
    updateConfigValue,
    updateBrief,
    updateNegotiationOffer,
    addFiles,
    removeFile,
    getFile,
    addCharacterReferenceFiles,
    removeCharacterReferenceFile,
    getCharacterReferenceFile,
    setAgreedToTerms,
    goToStep,
    goNext,
    goBack,
    submit,
    startOver,
  };
}
