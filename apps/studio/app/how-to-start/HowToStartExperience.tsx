"use client";

import { HeroSection } from "./components/HeroSection";
import { JourneyTimeline } from "./components/JourneyTimeline";
import { WhyDifferentSection } from "./components/WhyDifferentSection";
import { FaqSection } from "./components/FaqSection";
import { HowToStartCta } from "./components/HowToStartCta";

// Full "How to Start Your Project" experience, replacing /contact (30 Juli
// 2026 brief). Same page-experience pattern as WhyNimiaExperience /
// ServicesExperience / PortfolioExperience: a client component holding all
// the animated sections, kept out of page.tsx so that stays a plain async
// server component handling only auth/metadata.
//
// Section order is fixed by the brief and must not change:
// 1. Hero
// 2. Your Journey with Nimia (7-step timeline, Step 4 highlighted)
// 3. Why Our Process is Different (4 cards)
// 4. FAQ (accordion)
// 5. Closing CTA (red background)
//
// Deliberately NOT a contact form and NOT a plain FAQ page — every section
// exists to explain the actual order -> negotiate -> pay -> verify ->
// deliver flow that already exists in the dashboard (see
// app/dashboard/orders/OrderForm.tsx), so a prospective client trusts the
// process before they ever click "Start a Project".
export function HowToStartExperience() {
  return (
    <main className="relative">
      <HeroSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <JourneyTimeline />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <WhyDifferentSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <FaqSection />
      <HowToStartCta />
    </main>
  );
}
