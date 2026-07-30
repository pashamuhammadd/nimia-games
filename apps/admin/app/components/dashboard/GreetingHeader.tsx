"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Time-of-day greeting, computed client-side same as
// apps/studio/app/components/dashboard/GreetingHeader.tsx — it should
// reflect the visitor's actual local clock, which a Server Component has no
// reliable way to know.
export function GreetingHeader({ name, ctaHref }: { name: string; ctaHref: string }) {
  const [greeting, setGreeting] = React.useState<string | null>(null);

  React.useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1c0712] via-[#150710] to-[#0a0508] p-6 sm:p-9"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[var(--nimia-crimson)]/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-[var(--nimia-pink)]/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nimia-pink)]">
            Nimia Games Admin
          </span>
          <h1 className="nimia-font-display mt-2 text-2xl font-bold tracking-wide text-white sm:text-3xl">
            {greeting ?? "Welcome back"}
            {name ? `, ${name}` : ""} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/50 sm:text-base">
            Here&apos;s what&apos;s happening across the studio today.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-fit">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--nimia-crimson)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--nimia-crimson)]/25 transition-colors hover:bg-[var(--nimia-crimson-hover)]"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Review Pending Orders
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
