import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";
import { PublicNavbar } from "../components/PublicNavbar";

export const metadata: Metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <div className="nimia-dark">
      {/* Always false — middleware.ts redirects signed-in visitors away
          from /register to /dashboard before this page renders. */}
      <PublicNavbar isAuthenticated={false} />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <RegisterForm />
      </main>
    </div>
  );
}
