import Link from "next/link";
import { buttonVariants, cn } from "@nimia/ui";

// Added 9 Agustus 2026 (launch-readiness audit finding) — this app had no
// custom 404 at all, so an unmatched route (dashboard or public) fell back
// to Next.js's generic, unbranded not-found page. Wrapped in "nimia-dark"
// directly (rather than relying on whatever page happened to trigger it)
// so this always renders the dark brand theme consistently, whether it's
// reached from a public marketing route or from inside /dashboard/* (which
// separately wraps itself in nimia-dark too — see DashboardShell.tsx).
// Styled to match apps/www/app/not-found.tsx (same brand, same copy tone),
// swapped to @nimia/ui's Button/buttonVariants since that's this app's own
// convention rather than www's plain nimia-button-primary utility class.
export default function NotFound() {
  return (
    <div className="nimia-dark flex min-h-screen items-center justify-center bg-[var(--background)] px-5 md:px-6">
      <section className="flex flex-col items-center text-center">
        <p className="nimia-font-display text-5xl font-bold text-[var(--nimia-pink)] md:text-6xl">
          404
        </p>

        <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
          This page couldn&rsquo;t be found.
        </h1>

        <p className="mt-3 max-w-md text-sm text-white/55">
          Looks like the page you&rsquo;re looking for doesn&rsquo;t exist, or the link
          has changed. Let&rsquo;s get you back on track.
        </p>

        <Link href="/" className={cn(buttonVariants({ size: "md" }), "mt-6 rounded-full")}>
          Back to Home
        </Link>
      </section>
    </div>
  );
}
