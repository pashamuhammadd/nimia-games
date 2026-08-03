"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_BRIEF,
  INITIAL_ORDER_STATE,
  type CategoryDefinition,
  type ConfigSelections,
  type OrderWizardState,
  type ProjectBrief,
  type ServiceDefinition,
  type StepId,
  type UploadedFileMeta,
} from "../types";
import { getCategory, findServiceById } from "../data/catalog";
import { calculateEstimate, type Estimate } from "../pricing";
import { getDefaultSelections } from "./default-selections";
import { getStepsForService } from "./steps";
import { clearOrderState, loadOrderState, saveOrderState } from "./storage";
import { submitOrderAction } from "./submit-order-action";

function withStep(state: OrderWizardState, step: StepId, steps: StepId[]): OrderWizardState {
  const index = steps.indexOf(step);
  return {
    ...state,
    step,
    maxStepIndexReached: index > state.maxStepIndexReached ? index : state.maxStepIndexReached,
  };
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
      categoryId: candidate.categoryId ?? null,
      step: "service",
      maxStepIndexReached: 1,
    };
  }

  return {
    ...INITIAL_ORDER_STATE,
    ...candidate,
    brief: { ...EMPTY_BRIEF, ...candidate.brief },
    // Files never round-trip through localStorage (see state/storage.ts) —
    // always start the restored session with an empty list, regardless of
    // what an older save might contain.
    files: [],
  };
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
  steps: StepId[];
  currentStepIndex: number;
  estimate: Estimate;
  isHydrated: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitted: boolean;
  submittedIntent: SubmitIntent | null;
  selectCategory: (categoryId: string) => void;
  selectService: (serviceId: string) => void;
  selectPackage: (packageId: string) => void;
  updateConfigValue: (fieldId: string, value: string | boolean | string[]) => void;
  updateBrief: (patch: Partial<ProjectBrief>) => void;
  updateNegotiationOffer: (value: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  getFile: (id: string) => File | undefined;
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedIntent, setSubmittedIntent] = React.useState<SubmitIntent | null>(null);

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

  const category = getCategory(state.categoryId);
  const service = findServiceById(state.serviceId);
  const steps = getStepsForService(service);
  const currentStepIndex = Math.max(0, steps.indexOf(state.step));
  const estimate = calculateEstimate(service, state.packageId, state.configSelections);

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
    if (state.step === "brief") {
      return state.brief.projectTitle.trim().length > 0 && state.brief.projectDescription.trim().length > 0;
    }
    return true;
  }, [state.step, state.brief.projectTitle, state.brief.projectDescription]);

  const submit = React.useCallback(
    (intent: SubmitIntent) => {
      if (!state.agreedToTerms) {
        setSubmitError("Please confirm the checklist above before submitting.");
        return;
      }

      // Negotiating requires an actual number to send the team — "Submit
      // Order" alone (accepting the calculated estimate) has no such
      // requirement. (submitOrderAction re-validates this server-side too —
      // this is just so a visitor doesn't wait on a round trip to find out.)
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

      // Real submission (3 Agustus 2026, per user request — this used to be
      // a window.setTimeout local-only simulation that never wrote to
      // `orders`/`order_negotiations`, which is why a negotiated order never
      // showed up under /dashboard's Negotiations menu). See
      // submit-order-action.ts for the actual insert logic; "submit" ->
      // orders.status = 'pending_review', "negotiate" ->
      // orders.status = 'negotiating' + an order_negotiations row (per
      // packages/db/migrations/0012 and 0013).
      setIsSubmitting(true);
      submitOrderAction({
        intent,
        categoryId: state.categoryId,
        serviceId: state.serviceId,
        packageId: state.packageId,
        configSelections: state.configSelections,
        brief: state.brief,
        negotiationOffer: state.negotiationOffer,
      })
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
    },
    [
      isAuthenticated,
      router,
      state.agreedToTerms,
      state.negotiationOffer,
      state.categoryId,
      state.serviceId,
      state.packageId,
      state.configSelections,
      state.brief,
    ],
  );

  const startOver = React.useCallback(() => {
    clearOrderState();
    setFileBlobs({});
    setSubmitted(false);
    setSubmittedIntent(null);
    setSubmitError(null);
    setState(INITIAL_ORDER_STATE);
  }, []);

  return {
    state,
    category,
    service,
    steps,
    currentStepIndex,
    estimate,
    isHydrated,
    canGoNext,
    isSubmitting,
    submitError,
    submitted,
    submittedIntent,
    selectCategory,
    selectService,
    selectPackage,
    updateConfigValue,
    updateBrief,
    updateNegotiationOffer,
    addFiles,
    removeFile,
    getFile,
    setAgreedToTerms,
    goToStep,
    goNext,
    goBack,
    submit,
    startOver,
  };
}
