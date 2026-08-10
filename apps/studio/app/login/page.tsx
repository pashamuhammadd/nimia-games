import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";

// SEO fix, 10 Agustus 2026 — noindex, part of the sitewide SEO pass (see
// app/layout.tsx). Thin, no-content auth utility page: keeping it out of
// the index avoids diluting search results with a low-value page, while
// `follow: true` still lets crawlers reach anything it links to. Left
// crawlable in app/robots.ts on purpose (see that file's comment) so
// Google actually sees this tag instead of just being blocked from the URL.
export const metadata: Metadata = {
  title: "Log in",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  // Set by middleware.ts when bouncing a signed-out visitor off a
  // protected route, and by /order's Submit Order button (Step 7, via
  // modules/order/state/use-order-wizard.ts#submit) so a client who wasn't
  // logged in yet lands back on Review Order instead of the dashboard once
  // they sign in — see app/actions.ts#signInAction.
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const { redirectedFrom } = await searchParams;

  return (
    <div className="nimia-dark">
      {/* isAuthenticated is always false here: middleware.ts already
          redirects a signed-in visitor away from /login to /dashboard
          before this page ever renders. */}
      <PublicNavbar isAuthenticated={false} />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <LoginForm redirectedFrom={redirectedFrom} />
      </main>
      <Footer />
    </div>
  );
}
