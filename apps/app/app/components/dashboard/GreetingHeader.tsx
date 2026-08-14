"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, Globe } from "lucide-react";

// The public marketing homepage — added 11 Agustus 2026 per user report:
// the client dashboard had no way back to the marketing site once a client
// signed in, only the avatar menu's Logout.
//
// Fixed 14 Agustus 2026 (dashboard split): this used to be a relative "/",
// which was correct back when the dashboard lived inside apps/studio (the
// marketing homepage WAS "/" there). Now that the dashboard is its own app
// (apps/app), "/" here is this app's OWN root (which redirects to
// /dashboard, see app/page.tsx) — a relative link would just bounce the
// user right back to the dashboard instead of leaving it. Same
// NEXT_PUBLIC_STUDIO_URL absolute-URL pattern as PublicNavbar.tsx's own
// logo link.
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";
const HOMEPAGE_HREF = STUDIO_URL;

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// Time-of-day greeting (30 Juli 2026, Client Dashboard redesign). Computed
// client-side on purpose: it should reflect the actual visitor's local
// clock, and a Server Component has no reliable way to know that (the
// Vercel function's own clock is not the visitor's timezone). Renders a
// neutral fallback for the first paint, then swaps in after mount — a
// one-frame flash is a fair trade for a genuinely correct greeting instead
// of a server-guessed one.
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
            Welcome back
          </span>
          <h1 className="nimia-font-display mt-2 text-2xl font-bold tracking-wide text-white sm:text-3xl">
            {greeting ?? "Welcome back"}
            {name ? `, ${name}` : ""}{" "}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/50 sm:text-base">
            Ready to build your next amazing project?
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-fit">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--nimia-crimson)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--nimia-crimson)]/25 transition-colors hover:bg-[var(--nimia-crimson-hover)]"
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              Start a Project
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-fit">
            {/* Plain <a>, not next/link's Link — this is a cross-origin URL
              (app.nimiastudio.com -> nimiastudio.com) now, same as
              PublicNavbar.tsx's logo link and StartProjectButton.tsx. */}
            <a
              href={HOMEPAGE_HREF}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </a>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
