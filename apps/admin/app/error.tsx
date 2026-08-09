"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants, cn } from "@nimia/ui";

// Added 9 Agustus 2026 (launch-readiness audit finding) — this app had no
// error boundary at all, so any uncaught exception in a Server Component
// (e.g. a Supabase query failing on a network blip while staff are
// reviewing orders/payments) fell back to Next.js's generic, unbranded
// error page. Must be a Client Component ("use client") — Next.js App
// Router requirement for error.tsx.
//
// No error-reporting service wired up yet (Sentry or similar is still a P2
// item — see the launch-readiness audit) — console.error is the only
// record of what happened until that exists.
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 md:px-6">
      <section className="flex flex-col items-center text-center">
        <p className="nimia-font-display nimia-gradient-text text-5xl font-bold md:text-6xl">
          Oops
        </p>

        <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
          Something went wrong.
        </h1>

        <p className="mt-3 max-w-md text-sm text-white/55">
          An unexpected error occurred loading this page. You can try again, or
          head back to the dashboard — nothing was lost.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()} size="md" className="rounded-full">
            Try again
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "rounded-full")}
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
