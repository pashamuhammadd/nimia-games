"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";

interface CoreServiceCardProps {
  title: string;
  badge?: string;
  price: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

// SECTION 2 card. Per brief this card holds ONLY: icon, badge (optional),
// title, "starting from" price, description, CTA — no visual/thumbnail
// panel (that's what the previous version of this page had; this redesign
// explicitly drops it). Glassmorphism dark card, rounded-3xl, thin border,
// soft shadow; hover = lift + red border/glow + icon scale + CTA nudge.
// href points at an in-page anchor (e.g. "#animation") so "Explore Service"
// smooth-scrolls into that service's Section 3 detail block rather than
// navigating away.
export function CoreServiceCard({ title, badge, price, description, icon: Icon, href }: CoreServiceCardProps) {
  return (
    <a
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[var(--nimia-crimson)]/50 hover:shadow-[0_35px_90px_-25px_rgba(193,18,77,0.4)] sm:p-9"
    >
      {/* Hover-only red gradient wash, purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
        style={{
          background: "radial-gradient(circle at 85% 0%, rgba(193,18,77,0.16), transparent 60%)",
        }}
      />

      {badge ? (
        <span className="relative mb-2 inline-flex w-fit items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
          {badge}
        </span>
      ) : (
        // Keeps all 3 cards' titles vertically aligned regardless of
        // whether a badge is present, since the section uses auto-rows-fr.
        <span className="relative mb-2 h-[26px]" aria-hidden="true" />
      )}

      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-[var(--nimia-crimson)]/50 group-hover:bg-[var(--nimia-crimson)]/10">
        <Icon className="h-6 w-6 text-[var(--nimia-pink)]" strokeWidth={1.5} aria-hidden="true" />
      </div>

      <h3 className="nimia-font-display relative mt-6 text-2xl font-bold sm:text-[26px]">{title}</h3>

      <div className="relative mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
          Starting from
        </p>
        <p className="nimia-gradient-text nimia-font-display mt-1 text-4xl font-bold">{price}</p>
      </div>

      <p className="relative mt-5 flex-1 text-[15px] leading-relaxed text-[var(--nimia-muted)]">
        {description}
      </p>

      <div className="relative mt-8 flex items-center gap-2 text-sm font-semibold text-[var(--nimia-pink)]">
        <span className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
          Explore Service
        </span>
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5"
          aria-hidden="true"
        />
      </div>
    </a>
  );
}
