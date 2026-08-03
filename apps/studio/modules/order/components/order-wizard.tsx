"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Button, buttonVariants, cn } from "@nimia/ui";
import { useOrderWizard } from "../state/use-order-wizard";
import { OrderHeader } from "./order-header";
import { ProgressIndicator } from "./progress-indicator";
import { StepNavigation } from "./step-navigation";
import { CategorySelector } from "./category-selector";
import { ServiceSelector } from "./service-selector";
import { PackageSelector } from "./package-selector";
import { ConfigurationBuilder } from "./configuration-builder";
import { ProjectBriefForm } from "./project-brief-form";
import { UploadSection } from "./upload-section";
import { ReviewSection } from "./review-section";
import { PriceEstimator } from "./price-estimator";

export interface OrderWizardProps {
  isAuthenticated: boolean;
}

// The top-level orchestrator: owns no business logic itself (that all
// lives in useOrderWizard + data/catalog.ts + pricing/), just lays out the
// header, progress rail, current step's component, the sticky/bottom
// price estimator, and the back/continue/submit bar.
export function OrderWizard({ isAuthenticated }: OrderWizardProps) {
  const wizard = useOrderWizard(isAuthenticated);

  const selectedPackage = wizard.service?.packages?.find((pkg) => pkg.id === wizard.state.packageId) ?? null;

  if (wizard.submitted) {
    return (
      <div className="nimia-dark min-h-screen">
        <OrderHeader isAuthenticated={isAuthenticated} />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--nimia-crimson)]/15">
            <PartyPopper className="h-8 w-8 text-[var(--nimia-pink)]" aria-hidden="true" />
          </span>
          <h1 className="nimia-font-display mt-6 text-3xl font-bold text-white">
            {wizard.submittedIntent === "negotiate" ? "Offer submitted!" : "Order submitted!"}
          </h1>
          <p className="mt-3 text-white/60">
            {wizard.submittedIntent === "negotiate"
              ? "Thanks for configuring your project with Nimia Studio. Our team will review your offer and either approve it or send a counter offer — you can follow the negotiation from your dashboard."
              : "Thanks for configuring your project with Nimia Studio. Our team will review it and follow up with a final quotation shortly."}
          </p>
          <div className="mt-8 flex gap-3">
            <Button onClick={() => wizard.startOver()} variant="outline">
              Start a new project
            </Button>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants(),
                "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
              )}
            >
              Go to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="nimia-dark min-h-screen">
      <OrderHeader isAuthenticated={isAuthenticated} />

      <div className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ProgressIndicator
            steps={wizard.steps}
            currentStepIndex={wizard.currentStepIndex}
            maxStepIndexReached={wizard.state.maxStepIndexReached}
            onSelectStep={wizard.goToStep}
          />
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-28 pt-10 sm:px-6 lg:flex-row lg:items-start lg:pb-16">
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizard.state.step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {wizard.state.step === "category" ? (
                <CategorySelector
                  selectedCategoryId={wizard.state.categoryId}
                  onSelect={wizard.selectCategory}
                />
              ) : null}

              {wizard.state.step === "service" ? (
                <ServiceSelector
                  category={wizard.category}
                  selectedServiceId={wizard.state.serviceId}
                  onSelect={wizard.selectService}
                />
              ) : null}

              {wizard.state.step === "package" ? (
                <PackageSelector
                  service={wizard.service}
                  selectedPackageId={wizard.state.packageId}
                  onSelect={wizard.selectPackage}
                />
              ) : null}

              {wizard.state.step === "configure" ? (
                <ConfigurationBuilder
                  service={wizard.service}
                  selections={wizard.state.configSelections}
                  onChange={wizard.updateConfigValue}
                />
              ) : null}

              {wizard.state.step === "brief" ? (
                <ProjectBriefForm brief={wizard.state.brief} onChange={wizard.updateBrief} />
              ) : null}

              {wizard.state.step === "upload" ? (
                <UploadSection
                  files={wizard.state.files}
                  onAddFiles={wizard.addFiles}
                  onRemoveFile={wizard.removeFile}
                />
              ) : null}

              {wizard.state.step === "review" ? (
                <ReviewSection
                  category={wizard.category}
                  service={wizard.service}
                  packageName={selectedPackage ? `${selectedPackage.name} (${selectedPackage.quantityLabel})` : null}
                  configSelections={wizard.state.configSelections}
                  brief={wizard.state.brief}
                  files={wizard.state.files}
                  estimate={wizard.estimate}
                  agreedToTerms={wizard.state.agreedToTerms}
                  onAgreedToTermsChange={wizard.setAgreedToTerms}
                  onEditStep={wizard.goToStep}
                  submitError={wizard.submitError}
                  negotiationOffer={wizard.state.negotiationOffer}
                  onNegotiationOfferChange={wizard.updateNegotiationOffer}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10">
            <StepNavigation
              step={wizard.state.step}
              canGoBack={wizard.currentStepIndex > 0}
              canGoNext={wizard.canGoNext}
              isSubmitting={wizard.isSubmitting}
              onBack={wizard.goBack}
              onNext={wizard.goNext}
              onSubmit={() => wizard.submit("submit")}
              onNegotiate={() => wizard.submit("negotiate")}
            />
          </div>
        </div>

        <PriceEstimator
          category={wizard.category}
          service={wizard.service}
          packageName={selectedPackage ? `${selectedPackage.name} (${selectedPackage.quantityLabel})` : null}
          estimate={wizard.estimate}
        />
      </main>
    </div>
  );
}
