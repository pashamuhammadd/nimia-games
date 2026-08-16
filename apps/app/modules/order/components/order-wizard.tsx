"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Button, buttonVariants, cn } from "@nimia/ui";
import { useOrderWizard } from "../state/use-order-wizard";
import { BUNDLE_PACKAGES } from "../data/bundle-packages";
import { OrderHeader } from "./order-header";
import { OrderTypeSelector } from "./order-type-selector";
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
import { PackageBrowseGrid } from "./package-browse-grid";
import { PackageDetail } from "./package-detail";
// Custom Order Builder (12 Agustus 2026) — replaces the earlier
// CustomOrderPlaceholder screen with the real step machine below.
import { CustomServiceMultiSelector } from "./custom-service-multi-selector";
import { CustomOrderConfigureStep } from "./custom-order-configure-step";
import { PaymentMethodStep } from "./payment-method-step";
import { CustomOrderReviewSection } from "./custom-order-review-section";
import { CustomOrderPriceEstimator } from "./custom-order-price-estimator";

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
              ? "Thanks for configuring your project with Nimia Studio. Our team will review your offer and either approve it or send a counter offer. You can follow the negotiation from your dashboard."
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

  // STEP 0 — added 3 Agustus 2026, per user request. Nothing below this
  // point (ProgressIndicator, the step machine, StepNavigation, submit())
  // changed at all: "project-builder" is the only orderType that reaches
  // it, exactly the same wizard that existed before this addition.
  if (!wizard.orderType) {
    return (
      <div className="nimia-dark min-h-screen">
        <OrderHeader isAuthenticated={isAuthenticated} />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <OrderTypeSelector onSelect={wizard.selectOrderType} />
        </main>
      </div>
    );
  }

  // Custom Order Builder (12 Agustus 2026) — replaces the earlier
  // CustomOrderPlaceholder screen. Same layout shell (OrderHeader,
  // ProgressIndicator, StepNavigation) as the "packages" branch below, just
  // driven by CUSTOM_ORDER_STEPS/wizard.state.customServiceSelections
  // instead of BUNDLE_STEPS/wizard.bundlePackage. See
  // state/use-order-wizard.ts for how `steps`/`customEstimate`/`canGoNext`/
  // `submit` all branch on orderType === "custom".
  if (wizard.orderType === "custom") {
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
                {wizard.state.step === "custom-services" ? (
                  <div>
                    <button
                      type="button"
                      onClick={wizard.resetOrderType}
                      className="mb-4 text-sm font-medium text-white/45 transition-colors hover:text-white"
                    >
                      ← Change order type
                    </button>
                    <CustomServiceMultiSelector
                      selections={wizard.state.customServiceSelections}
                      onAdd={wizard.addCustomService}
                      onRemove={wizard.removeCustomService}
                    />
                  </div>
                ) : null}

                {wizard.state.step === "custom-configure" ? (
                  <CustomOrderConfigureStep
                    selections={wizard.state.customServiceSelections}
                    onRemove={wizard.removeCustomService}
                    onUpdateConfig={wizard.updateCustomServiceConfig}
                    onSetPackageTier={wizard.setCustomServicePackageTier}
                  />
                ) : null}

                {wizard.state.step === "brief" ? (
                  <ProjectBriefForm
                    brief={wizard.state.brief}
                    onChange={wizard.updateBrief}
                    isAnimationOrder={wizard.isAnimationOrder}
                  />
                ) : null}

                {wizard.state.step === "upload" ? (
                  <div className="flex flex-col gap-10">
                    <UploadSection
                      files={wizard.state.files}
                      onAddFiles={wizard.addFiles}
                      onRemoveFile={wizard.removeFile}
                    />
                    {/* Animation Validation (16 Agustus 2026, Fase 5) — a
                        second, dedicated, required upload zone, only
                        rendered for Animation orders (see
                        FASE0-AUDIT.md section E's "Character Images
                        entirely missing" finding). Images-only accept,
                        since these are reference art, not general
                        attachments. */}
                    {wizard.isAnimationOrder ? (
                      <UploadSection
                        files={wizard.state.characterReferenceFiles}
                        onAddFiles={wizard.addCharacterReferenceFiles}
                        onRemoveFile={wizard.removeCharacterReferenceFile}
                        title="Character reference images"
                        subtitle="Share character designs, model sheets, or visual references our animators should match."
                        accept=".jpg,.jpeg,.png,.webp,.gif"
                        helperText="Images only — up to 20.0 MB each"
                        requiredHint="At least one character reference image is required for Animation projects."
                      />
                    ) : null}
                  </div>
                ) : null}

                {wizard.state.step === "custom-payment" ? (
                  <PaymentMethodStep
                    paymentMethod={wizard.state.paymentMethod}
                    onSelect={wizard.setPaymentMethod}
                    estimate={wizard.customEstimate}
                    installmentFeePercentage={wizard.installmentFeePercentage}
                  />
                ) : null}

                {wizard.state.step === "review" ? (
                  <CustomOrderReviewSection
                    selections={wizard.state.customServiceSelections}
                    paymentMethod={wizard.state.paymentMethod}
                    estimate={wizard.customEstimate}
                    brief={wizard.state.brief}
                    files={wizard.state.files}
                    agreedToTerms={wizard.state.agreedToTerms}
                    onAgreedToTermsChange={wizard.setAgreedToTerms}
                    onEditStep={wizard.goToStep}
                    submitError={wizard.submitError}
                    negotiationOffer={wizard.state.negotiationOffer}
                    onNegotiationOfferChange={wizard.updateNegotiationOffer}
                    isAnimationOrder={wizard.isAnimationOrder}
                    characterReferenceFiles={wizard.state.characterReferenceFiles}
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

          <CustomOrderPriceEstimator
            estimate={wizard.customEstimate}
            paymentMethod={wizard.state.paymentMethod}
          />
        </main>
      </div>
    );
  }

  // Package/Bundle system (10 Agustus 2026, per user request) — reuses
  // exactly the same layout shell (OrderHeader, ProgressIndicator,
  // StepNavigation, PriceEstimator) as the Project Builder flow below, just
  // driven by BUNDLE_STEPS/wizard.bundlePackage instead of
  // ORDER_STEPS/wizard.service. See state/use-order-wizard.ts for how
  // `steps`/`estimate`/`canGoNext`/`submit` all branch on orderType.
  if (wizard.orderType === "packages") {
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
                {wizard.state.step === "browse" ? (
                  <div>
                    <button
                      type="button"
                      onClick={wizard.resetOrderType}
                      className="mb-4 text-sm font-medium text-white/45 transition-colors hover:text-white"
                    >
                      ← Change order type
                    </button>
                    <PackageBrowseGrid
                      packages={BUNDLE_PACKAGES}
                      onSelect={wizard.selectBundlePackage}
                      onCustomOrder={() => wizard.selectOrderType("custom")}
                    />
                  </div>
                ) : null}

                {wizard.state.step === "package-detail" ? (
                  <PackageDetail
                    pkg={wizard.bundlePackage}
                    selectedOptionIds={wizard.state.bundleCreativeContentIds}
                    onToggleOption={wizard.toggleBundleCreativeContent}
                    onCustomOrder={() => wizard.selectOrderType("custom")}
                  />
                ) : null}

                {wizard.state.step === "brief" ? (
                  <ProjectBriefForm
                    brief={wizard.state.brief}
                    onChange={wizard.updateBrief}
                    isAnimationOrder={wizard.isAnimationOrder}
                  />
                ) : null}

                {wizard.state.step === "upload" ? (
                  <div className="flex flex-col gap-10">
                    <UploadSection
                      files={wizard.state.files}
                      onAddFiles={wizard.addFiles}
                      onRemoveFile={wizard.removeFile}
                    />
                    {/* Animation Validation (16 Agustus 2026, Fase 5) — a
                        second, dedicated, required upload zone, only
                        rendered for Animation orders (see
                        FASE0-AUDIT.md section E's "Character Images
                        entirely missing" finding). Images-only accept,
                        since these are reference art, not general
                        attachments. */}
                    {wizard.isAnimationOrder ? (
                      <UploadSection
                        files={wizard.state.characterReferenceFiles}
                        onAddFiles={wizard.addCharacterReferenceFiles}
                        onRemoveFile={wizard.removeCharacterReferenceFile}
                        title="Character reference images"
                        subtitle="Share character designs, model sheets, or visual references our animators should match."
                        accept=".jpg,.jpeg,.png,.webp,.gif"
                        helperText="Images only — up to 20.0 MB each"
                        requiredHint="At least one character reference image is required for Animation projects."
                      />
                    ) : null}
                  </div>
                ) : null}

                {/* Payment Method step (15 Agustus 2026, generalized from
                    Custom Order Builder — see PaymentMethodStepProps' own
                    `estimate: { subtotal }` shape in payment-method-step.tsx,
                    narrow enough that Package's plain `Estimate.totalPrice`
                    satisfies it with zero adapter needed). Placed right
                    before Review, same spot Custom Order's own
                    "custom-payment" step occupies. */}
                {wizard.state.step === "payment" ? (
                  <PaymentMethodStep
                    paymentMethod={wizard.state.paymentMethod}
                    onSelect={wizard.setPaymentMethod}
                    estimate={{ subtotal: wizard.estimate.totalPrice }}
                    installmentFeePercentage={wizard.installmentFeePercentage}
                  />
                ) : null}

                {wizard.state.step === "review" ? (
                  <ReviewSection
                    category={null}
                    service={null}
                    packageName={null}
                    configSelections={{}}
                    brief={wizard.state.brief}
                    files={wizard.state.files}
                    estimate={wizard.estimate}
                    agreedToTerms={wizard.state.agreedToTerms}
                    onAgreedToTermsChange={wizard.setAgreedToTerms}
                    onEditStep={wizard.goToStep}
                    submitError={wizard.submitError}
                    negotiationOffer={wizard.state.negotiationOffer}
                    onNegotiationOfferChange={wizard.updateNegotiationOffer}
                    bundle={
                      wizard.bundlePackage
                        ? {
                            pkg: wizard.bundlePackage,
                            selectedOptions: wizard.bundlePackage.creativeOptions.filter((option) =>
                              wizard.state.bundleCreativeContentIds.includes(option.id),
                            ),
                          }
                        : null
                    }
                    isAnimationOrder={wizard.isAnimationOrder}
                    characterReferenceFiles={wizard.state.characterReferenceFiles}
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
            category={null}
            service={null}
            packageName={null}
            estimate={wizard.estimate}
            bundleLabel={wizard.bundlePackage ? "Package" : null}
            bundleTitle={wizard.bundlePackage?.name ?? null}
          />
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
                <div>
                  <button
                    type="button"
                    onClick={wizard.resetOrderType}
                    className="mb-4 text-sm font-medium text-white/45 transition-colors hover:text-white"
                  >
                    ← Change order type
                  </button>
                  <CategorySelector
                    selectedCategoryId={wizard.state.categoryId}
                    onSelect={wizard.selectCategory}
                  />
                </div>
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
                <ProjectBriefForm
                  brief={wizard.state.brief}
                  onChange={wizard.updateBrief}
                  isAnimationOrder={wizard.isAnimationOrder}
                />
              ) : null}

              {wizard.state.step === "upload" ? (
                <div className="flex flex-col gap-10">
                  <UploadSection
                    files={wizard.state.files}
                    onAddFiles={wizard.addFiles}
                    onRemoveFile={wizard.removeFile}
                  />
                  {/* Animation Validation (16 Agustus 2026, Fase 5) — see
                      the Custom Order branch above's identical comment. */}
                  {wizard.isAnimationOrder ? (
                    <UploadSection
                      files={wizard.state.characterReferenceFiles}
                      onAddFiles={wizard.addCharacterReferenceFiles}
                      onRemoveFile={wizard.removeCharacterReferenceFile}
                      title="Character reference images"
                      subtitle="Share character designs, model sheets, or visual references our animators should match."
                      accept=".jpg,.jpeg,.png,.webp,.gif"
                      helperText="Images only — up to 20.0 MB each"
                      requiredHint="At least one character reference image is required for Animation projects."
                    />
                  ) : null}
                </div>
              ) : null}

              {/* Payment Method step (15 Agustus 2026, generalized from
                  Custom Order Builder — see the Package branch above's
                  identical comment). */}
              {wizard.state.step === "payment" ? (
                <PaymentMethodStep
                  paymentMethod={wizard.state.paymentMethod}
                  onSelect={wizard.setPaymentMethod}
                  estimate={{ subtotal: wizard.estimate.totalPrice }}
                  installmentFeePercentage={wizard.installmentFeePercentage}
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
                  isAnimationOrder={wizard.isAnimationOrder}
                  characterReferenceFiles={wizard.state.characterReferenceFiles}
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
