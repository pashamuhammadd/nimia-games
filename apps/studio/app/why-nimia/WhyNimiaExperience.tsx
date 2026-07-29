"use client";

import { HeroHeadline } from "./components/HeroHeadline";
import { ComparisonSection } from "./components/ComparisonSection";
import { PipelineSection } from "./components/PipelineSection";
import { ConceptVisual } from "./components/ConceptVisual";
import { DashboardMockup } from "./components/DashboardMockup";
import { ClosingCta } from "./components/ClosingCta";

// Full "Why Nimia" experience (redesigned 29 Juli 2026, replacing the
// "check back soon" placeholder). Kept as its own client component so the
// page.tsx server component can stay a plain async function that only
// handles auth/metadata, per the pattern already used across this app's
// other public pages.
//
// Section order follows the brief exactly: headline -> comparison ->
// pipeline -> concept-to-product visual -> client dashboard -> closing CTA.
// Every section frames AI as a tool Nimia uses well, never as something to
// put down, per explicit instruction.
export function WhyNimiaExperience() {
  return (
    <main className="relative">
      <HeroHeadline />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <ComparisonSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <PipelineSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <ConceptVisual />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <DashboardMockup />
      <ClosingCta />
    </main>
  );
}
