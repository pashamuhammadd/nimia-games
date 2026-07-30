import { NextResponse, type NextRequest } from "next/server";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/modules/partners";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS } from "../../lib/referralCookie";

// GET /r/:code — brief's "REFERRAL LINK" behavior: opening this link stores
// the code, then sends the visitor to Register with it pre-filled. This is
// a Route Handler (not a page) since it has no UI of its own, only a
// redirect + cookie write. Next.js Route Handler files may only export the
// HTTP-method functions (plus a small allow-list like `dynamic`/`runtime`)
// — the cookie name/lifetime constants live in ../../lib/referralCookie.ts
// instead of being exported from here, so this file stays a valid handler.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeReferralCode(code ?? "");

  const response = NextResponse.redirect(new URL("/register", request.url));

  // Only persist a code that's at least well-formed — a malformed/typo'd
  // code in the URL shouldn't silently poison the cookie with garbage the
  // register page would then have to re-validate anyway.
  if (isValidReferralCodeFormat(normalized)) {
    response.cookies.set(REFERRAL_COOKIE_NAME, normalized, {
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
