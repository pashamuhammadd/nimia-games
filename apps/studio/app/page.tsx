import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { HomeNavbar } from "./components/home/HomeNavbar";
import { HomeHero } from "./components/home/HomeHero";
import { SelectedWorkSection } from "./components/home/SelectedWorkSection";
import { ServicesSection } from "./components/home/ServicesSection";
import { HowItWorksSection } from "./components/home/HowItWorksSection";
import { FinalCtaSection } from "./components/home/FinalCtaSection";
import { HomeFooter } from "./components/home/HomeFooter";
import { getSelectedWork } from "./components/home/selected-work";

// Homepage redesign — Tahap 1 (3 November 2026), Orchid Pulse + Motion
// Frame, per docs/nimia-studio-redesign/. Replaces the Creative Agent hero
// and the ToolsSection: the Creative Agent is no longer part of the new
// visitor experience (approved product decision), but its module, the
// /creative-agent page (already noindex) and /api/creative-agent are left
// in place so historical creative_agent orders keep working. No title
// here on purpose: the root layout's title.default is the homepage title.
export const metadata: Metadata = {
  description:
    "Nimia Studio is an independent creative studio for animation and development. See our work, then start a project and agree on scope and price before anything is final.",
  alternates: {
    canonical: "/",
  },
};

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const [
    {
      data: { user },
    },
    selectedWork,
  ] = await Promise.all([supabase.auth.getUser(), getSelectedWork(3)]);

  const isAuthenticated = !!user;
  const featured = selectedWork.status === "ok" ? selectedWork.items[0] : null;

  return (
    <div className="studio-orchid min-h-screen">
      <a
        href="#main"
        className="sr-only rounded-full bg-[var(--orchid-text)] px-4 py-2 font-semibold text-[var(--orchid-bg)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <HomeNavbar isAuthenticated={isAuthenticated} />
      <main id="main">
        <HomeHero isAuthenticated={isAuthenticated} featured={featured} />
        <SelectedWorkSection result={selectedWork} />
        <ServicesSection isAuthenticated={isAuthenticated} />
        <HowItWorksSection />
        <FinalCtaSection isAuthenticated={isAuthenticated} />
      </main>
      <HomeFooter />
    </div>
  );
}
