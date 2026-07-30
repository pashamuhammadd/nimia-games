import type { LucideIcon } from "lucide-react";

// Shared "coming soon" placeholder for sidebar destinations whose backend
// doesn't exist yet (30 Juli 2026, Client Dashboard redesign) — Negotiations,
// Deliveries, Vouchers, Quests all need a real page to exist so the sidebar
// links don't 404, but the brief is explicit: "Jangan membuat semuanya
// sekarang" (don't build all of it now). This is the minimal, on-brand
// placeholder each of those route.tsx files renders; swap it out for the
// real page once that feature's backend (Tahap 5+) lands.
export function ComingSoonState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center sm:py-20">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--nimia-crimson)]/20 to-[var(--nimia-pink)]/10 blur-lg"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-[var(--nimia-pink)]" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="max-w-sm text-sm text-white/45">{description}</p>
      </div>
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50">
        Coming soon
      </span>
    </div>
  );
}
