"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants, cn } from "@nimia/ui";

// Added 9 Agustus 2026 (launch-readiness audit finding) — this app had no
// error boundary at all, so any uncaught exception in a Server Component
// (e.g. a Supabase query failing on a network blip) fell back to Next.js's
// generic, unbranded error page with no way back into the app. Must be a
// Client Component ("use client") — this is a Next.js App Router
// requirement for error.tsx, since it needs the reset() callback and
// receives the error as a prop rather than throwing.
//
// No error-reporting service wired up yet (Sentry or similar is still a P2
// item — see the launch-readiness audit) — console.error here is the only
// record of what happened until that exists, same as this app's existing
// pattern of logging failures that don't need to interrupt the user (see
// e.g. submit-order-action.ts's order_files insert failure).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx] Unhandled error:", error);
  }, [error]);

  return (
    <div className="nimia-dark flex min-h-screen items-center justify-center bg-[var(--background)] px-5 md:px-6">
      <section className="flex flex-col items-center text-center">
        <p className="nimia-font-display text-5xl font-bold text-[var(--nimia-pink)] md:text-6xl">
          Oops
        </p>

        <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
          Something went wrong.
        </h1>

        <p className="mt-3 max-w-md text-sm text-white/55">
          An unexpected error occurred. You can try again, or head back to the
          homepage — your account and any saved order details are safe.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()} size="md" className="rounded-full">
            Try again
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "rounded-full")}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}
