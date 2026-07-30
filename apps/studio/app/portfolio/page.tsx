import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { PortfolioExperience } from "./PortfolioExperience";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "A curated preview of animations, games, and digital experiences crafted by Nimia Studio. Visit the full portfolio for the complete collection.",
};

// Rebuilt as a "Portfolio Preview" teaser (30 Juli 2026 brief), replacing
// the earlier placeholder that was waiting on real work to show. This page
// is intentionally NOT the full portfolio — the complete collection lives
// on its own subdomain, portfolio.nimiagames.com (planned in the
// 3-subdomain architecture described in docs/ARCHITECTURE.md, not built
// yet as of this session). Every CTA on this page points there already;
// see PortfolioExperience.tsx and data.ts.
export default async function PortfolioPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <PortfolioExperience />
    </div>
  );
}
