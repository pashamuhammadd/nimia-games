import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RegisterForm } from "./RegisterForm";
import { PublicNavbar } from "../components/PublicNavbar";
import { REFERRAL_COOKIE_NAME } from "../lib/referralCookie";

export const metadata: Metadata = { title: "Sign up" };

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
    </div>
  );
}
