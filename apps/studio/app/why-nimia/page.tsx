import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { buttonVariants, cn } from "@nimia/ui";
import { PublicNavbar } from "../components/PublicNavbar";

export const metadata: Metadata = { title: "Why Nimia" };

// Placeholder page (29 Juli 2026) — added as part of the 5-item navbar
// expansion (Home, Why Nimia, Services, Portfolio, Contact). The user
// confirmed this should be its own page and that they'll send their own
// bullet points for what makes Nimia Games worth choosing — those haven't
// arrived yet, so this deliberately does NOT invent claims/reasons.
// Replace the section below with the real content once it's sent.
export default async function WhyNimiaPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="nimia-font-display text-3xl font-bold tracking-tight">Why Nimia</h1>
        <p className="mx-auto mt-4 max-w-lg text-[var(--nimia-muted)]">
          This page is being written — we want to tell you exactly what sets
          Nimia Games apart, properly, instead of filling this space with
          generic claims. Check back soon.
        </p>
        <div className="mt-8">
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
            )}
          >
            Get in touch in the meantime
          </Link>
        </div>
      </main>
    </div>
  );
}
