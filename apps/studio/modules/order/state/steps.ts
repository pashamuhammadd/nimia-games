import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Package, Layers, SlidersHorizontal, FileText, Upload, ClipboardCheck } from "lucide-react";
import type { ServiceDefinition, StepId } from "../types";
import { BUNDLE_STEPS } from "../types/order-state";

export const STEP_META: Record<StepId, { label: string; shortLabel: string; icon: LucideIcon }> = {
  category: { label: "Category", shortLabel: "Category", icon: LayoutGrid },
  service: { label: "Service", shortLabel: "Service", icon: Layers },
  package: { label: "Package", shortLabel: "Package", icon: Package },
  configure: { label: "Configure Project", shortLabel: "Configure", icon: SlidersHorizontal },
  brief: { label: "Project Brief", shortLabel: "Brief", icon: FileText },
  upload: { label: "Upload Files", shortLabel: "Files", icon: Upload },
  review: { label: "Review Order", shortLabel: "Review", icon: ClipboardCheck },
  // Package/Bundle system (10 Agustus 2026) — reuses the same Package/
  // SlidersHorizontal icons Project Builder already uses elsewhere instead
  // of importing anything new, per the brief's "only existing icon library"
  // rule.
  browse: { label: "Browse Packages", shortLabel: "Browse", icon: Package },
  "package-detail": { label: "Package Details", shortLabel: "Customize", icon: SlidersHorizontal },
};

/**
 * The wizard's step sequence is itself data-driven off the selected
 * service: a "packages" service (e.g. GIF/Sticker) goes through the
 * Package step, a "startingFrom" service (e.g. Character Animation) skips
 * straight from Service to Configure — per the brief. Before a service is
 * chosen we default to including Package so the progress indicator has a
 * stable step count to show.
 */
export function getStepsForService(service: ServiceDefinition | null): StepId[] {
  const steps: StepId[] = ["category", "service"];
  const includePackageStep = !service || service.pricingModel === "packages";
  if (includePackageStep) steps.push("package");
  steps.push("configure", "brief", "upload", "review");
  return steps;
}

/** Package/Bundle system's step sequence (10 Agustus 2026) — a fixed
 * sequence (no service-dependent branching, unlike getStepsForService)
 * since every bundle package goes through the same Browse -> Package Detail
 * -> Brief -> Upload -> Review flow. */
export function getStepsForBundle(): StepId[] {
  return [...BUNDLE_STEPS];
}
