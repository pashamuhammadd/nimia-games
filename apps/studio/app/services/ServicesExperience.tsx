"use client";

import { HeroSection } from "./components/HeroSection";
import { CoreServicesSection } from "./components/CoreServicesSection";
import { ExploreServicesSection } from "./components/ExploreServicesSection";
import { ProjectTypesSection } from "./components/ProjectTypesSection";
import { AddonsSection } from "./components/AddonsSection";
import { PackagesSection } from "./components/PackagesSection";
import { ServicesCta } from "./components/ServicesCta";

// Full "Services" page experience (redesigned 29 Juli 2026, replacing the
// earlier premium-but-thin 3-card-only version of this page). Same pattern
// as app/why-nimia/WhyNimiaExperience.tsx: a client component holding all
// the animated sections, kept out of page.tsx so that file can stay a
// plain async server component handling only auth/metadata.
//
// Section order is fixed by the brief and must not change:
// 1. Hero
// 2. Core Services (3 cards)
// 3. Explore Our Services (detail per core service)
// 4. Project Types (chips)
// 5. Optional Add-ons (small cards)
// 6. Featured Packages
// 7. Closing CTA (red background)
//
// Deliberately does NOT repeat a "Why Nimia" style AI-vs-Nimia comparison
// or a company workflow/pipeline timeline (both already live on
// /why-nimia) — this page's job is only to explain the services
// themselves, per explicit instruction.
export function ServicesExperience() {
  return (
    <main className="relative">
      <HeroSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <CoreServicesSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <ExploreServicesSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <ProjectTypesSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <AddonsSection />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <PackagesSection />
      <ServicesCta />
    </main>
  );
}
