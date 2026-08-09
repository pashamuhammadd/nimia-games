import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";
import { WhyNimiaExperience } from "./WhyNimiaExperience";

export const metadata: Metadata = {
  title: "Why Nimia",
  description:
    "AI can generate images in seconds. Nimia turns ideas into production-ready games, animation, and digital assets with professional art direction, a dedicated creative team, and a live project dashboard.",
};

// Redesigned 29 Juli 2026, replacing the earlier "check back soon"
// placeholder now that the user sent the full content brief for this page.
// The section-by-section content itself lives in WhyNimiaExperience.tsx
// (a client component, since it uses Framer Motion) so this file stays a
// thin server component that only handles auth state for the navbar, same
// pattern as page.tsx and services/page.tsx.
//
// isAuthenticated is now threaded down into WhyNimiaExperience -> ClosingCta
// too (3 Agustus 2026, per user request — modal login sitewide) so that
// page's "Start Your Project" CTA can use the shared StartProjectButton.
export default async function WhyNimiaPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <WhyNimiaExperience isAuthenticated={!!user} />
      <Footer />
    </div>
  );
}
