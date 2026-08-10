import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";
import { PartnersMarketingExperience } from "./PartnersMarketingExperience";

export const metadata: Metadata = {
  title: "Partner Program",
  description:
    "Earn rewards for introducing new clients to Nimia Studio. Every account is automatically enrolled with a personal referral link, no application, no fees. Join the Nimia Partner Program.",
};

// Public marketing page for the Nimia Partner Program (10 Agustus 2026,
// launch-readiness audit finding). The client-facing side of the program
// (apps/studio/app/dashboard/partners) has been live since 30 Juli 2026,
// but there was no page anywhere that a visitor could land on to learn the
// program exists — PublicNavbar.tsx used to carry a comment referencing a
// planned "/ambassador/apply" page that was never built. This route is
// that missing discovery/marketing surface, at /partners instead: no
// separate apply/approval flow is needed (every account already
// auto-becomes a partner per migration 0016's handle_new_auth_user()
// trigger), so its CTA is just a normal /register link with
// partner-focused framing, or straight to the visitor's own dashboard if
// they're already signed in.
//
// Same thin-server-component pattern as every other public page in this
// app (services/why-nimia/how-to-start/portfolio): this file only resolves
// auth state for the navbar/CTA and sets metadata — all real content lives
// in the client Experience component below.
export default async function PartnersMarketingPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />
      <PartnersMarketingExperience isAuthenticated={!!user} />
      <Footer />
    </div>
  );
}
