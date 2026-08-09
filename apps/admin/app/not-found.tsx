import Link from "next/link";
import { buttonVariants, cn } from "@nimia/ui";

// Added 9 Agustus 2026 (launch-readiness audit finding) — this app had no
// custom 404 at all, so an unmatched route fell back to Next.js's generic,
// unbranded not-found page. No "nimia-dark" wrapper needed here (unlike
// apps/studio) — admin.nimiagames.com is dark at :root everywhere already,
// see globals.css's own header comment.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 md:px-6">
      <section className="flex flex-col items-center text-center">
        <p className="nimia-font-display nimia-gradient-text text-5xl font-bold md:text-6xl">
          404
        </p>

        <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
          This page couldn&rsquo;t be found.
        </h1>

        <p className="mt-3 max-w-md text-sm text-white/55">
          The page you&rsquo;re looking for doesn&rsquo;t exist, or the link has
          changed. Let&rsquo;s get you back to the dashboard.
        </p>

        <Link href="/" className={cn(buttonVariants({ size: "md" }), "mt-6 rounded-full")}>
          Back to Dashboard
        </Link>
      </section>
    </div>
  );
}
