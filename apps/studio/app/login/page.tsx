import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { PublicNavbar } from "../components/PublicNavbar";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      {/* isAuthenticated is always false here: middleware.ts already
          redirects a signed-in visitor away from /login to /dashboard
          before this page ever renders. */}
      <PublicNavbar isAuthenticated={false} />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <LoginForm />
      </main>
    </>
  );
}
