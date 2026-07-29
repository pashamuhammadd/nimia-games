import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { buttonVariants, cn } from "@nimia/ui";
import { PublicNavbar } from "../components/PublicNavbar";

export const metadata: Metadata = { title: "Portfolio" };

// Placeholder page (29 Juli 2026) — added as part of the 5-item navbar
// expansion (Home, Why Nimia, Services, Portfolio, Contact). The user
// explicitly chose to wait for new/real work before populating this page
// rather than reusing the old "Recent Work" showcase videos/Lifetopia
// preview that were removed from the home page earlier in this session —
// do NOT bring that content back here. Replace this section once real
// portfolio pieces are sent.
export default async function PortfolioPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="nimia-font-display text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="mx-auto mt-4 max-w-lg text-[var(--nimia-muted)]">
          We&apos;re putting together a fresh set of work to show here. Check
          back soon, or get in touch and we can share examples directly.
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
