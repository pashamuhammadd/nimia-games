import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";
import { ServicesExperience } from "./ServicesExperience";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Animation, game development, and website development for businesses, startups, and studios. Explore what Nimia Studio builds and find the right service or package for your project.",
  // SEO fix, 10 Agustus 2026 — canonical URL, part of the sitewide SEO
  // pass (see app/layout.tsx). Resolves against root's metadataBase.
  alternates: {
    canonical: "/services",
  },
};

// Rebuilt as a full 7-section services experience (29 Juli 2026 redesign
// brief). This page is deliberately NOT a pricing page, NOT a portfolio,
// and NOT a company-profile page — its only job is to explain what Nimia
// Studio offers, in depth, with a premium dark-cinematic presentation
// (Linear / Cub Studio / Buck / Riot / Epic / Figma-tier reference).
//
// This REPLACES the previous version of this page, which rendered exactly
// the 3 core-service cards and nothing else (built earlier the same day).
// That 3-card block is now just Section 2 ("Core Services") of a much
// larger page — see ServicesExperience.tsx for the full section order and
// app/services/data.ts for all copy/pricing.
//
// The section components that used to live at
// app/components/services/{ServicesSection,ServiceCard}.tsx are no longer
// imported from here (Section 2's card design changed: no visual/thumbnail
// panel per the new brief) — they're currently unused. Section 3 of this
// redesign does still reuse the abstract per-category visuals from
// app/components/services/visuals.tsx (AnimationVisual / GameDevVisual /
// WebsiteVisual), so that file stays in use.
//
// isAuthenticated is now threaded down into ServicesExperience (3 Agustus
// 2026, per user request — modal login sitewide) so every "Start Your
// Project" CTA on this page (Hero, Featured Packages, Closing CTA) can use
// the shared StartProjectButton instead of a plain link.
export default async function ServicesPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <ServicesExperience isAuthenticated={!!user} />
      <Footer />
    </div>
  );
}
