import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { PublicNavbar } from "../components/PublicNavbar";
import { Footer } from "../components/Footer";

export const metadata: Metadata = { title: "Log in" };

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
