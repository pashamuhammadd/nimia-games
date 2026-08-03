import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { HowToStartExperience } from "./HowToStartExperience";

export const metadata: Metadata = {
  title: "How to Start Your Project",
  description:
    "A complete guide to working with Nimia Studio: create an account, submit your project, negotiate a fair price, pay securely with crypto, and track production from your dashboard.",
};

// Replaces the old /contact page (30 Juli 2026 brief — removed entirely,
// including its ContactForm/actions.ts). This is deliberately NOT a
// contact form and NOT a plain FAQ page: it walks a prospective client
// through the entire Nimia Studio transaction flow, end to end, so they
// understand how ordering works, that pricing is negotiable, and that the
// whole process (including blockchain payment verification) is transparent
// before they ever click "Start a Project". Same pattern as page.tsx on
// /why-nimia, /services, /portfolio: a thin async server component here for
// auth/metadata, all animated section content lives in
// HowToStartExperience.tsx.
//
// isAuthenticated is now threaded down into HowToStartExperience too
// (3 Agustus 2026, per user request — modal login sitewide) so this page's
// Hero and Closing CTA can use the shared StartProjectButton.
export default async function HowToStartPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <HowToStartExperience isAuthenticated={!!user} />
    </div>
  );
}
