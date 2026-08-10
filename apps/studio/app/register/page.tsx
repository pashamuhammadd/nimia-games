import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RegisterForm } from "./RegisterForm";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";
import { REFERRAL_COOKIE_NAME } from "../lib/referralCookie";

// SEO fix, 10 Agustus 2026 — noindex, part of the sitewide SEO pass (see
// app/layout.tsx). Thin, no-content auth utility page: keeping it out of
// the index avoids diluting search results with a low-value page, while
// `follow: true` still lets crawlers reach anything it links to. Left
// crawlable in app/robots.ts on purpose (see that file's comment) so
// Google actually sees this tag instead of just being blocked from the URL.
export const metadata: Metadata = {
  title: "Sign up",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function RegisterPage() {
  // Set by app/r/[code]/route.ts when this visitor arrived via a partner's
  // referral link — RegisterForm pre-fills its optional Referral Code field
  // from this, but the field stays editable until the account is created
  // (brief: "User tetap dapat menggantinya sebelum akun dibuat").
  const cookieStore = await cookies();
  const initialReferralCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? "";

  return (
    <div className="nimia-dark">
      {/* Always false — middleware.ts redirects signed-in visitors away
          from /register to /dashboard before this page renders. */}
      <PublicNavbar isAuthenticated={false} />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <RegisterForm initialReferralCode={initialReferralCode} />
      </main>
      <Footer />
    </div>
  );
}
