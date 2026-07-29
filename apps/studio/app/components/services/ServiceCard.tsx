"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  items: readonly string[];
  icon: LucideIcon;
  visual: ComponentType;
  href: string;
}

// Single service card. Kept as a plain presentational component (no
// framer-motion in here) — the entrance animation lives one level up in
// ServicesSection.tsx (each card is wrapped in its own motion.div), so this
// file only owns layout, hover states, and the abstract visual slot.
//
// The whole card is a single <Link> (not just the "Explore Service" line)
// since that's the friendlier click target and avoids nesting an <a> inside
// an <a>. "Explore Service" is styled like a button/link but is really just
// the last row of the same link.
export function ServiceCard({ title, description, items, icon: Icon, visual: Visual, href }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[var(--nimia-crimson)]/50 hover:shadow-[0_35px_90px_-25px_rgba(193,18,77,0.4)] sm:p-9"
    >
      {/* Hover-only red gradient wash, purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
        style={{
          background: "radial-gradient(circle at 85% 0%, rgba(193,18,77,0.16), transparent 60%)",
        }}
      />

      <div className="relative h-40 overflow-hidden rounded-2xl border border-white/5 bg-black/20 sm:h-44">
        <Visual />
      </div>

      <div className="relative mt-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-[var(--nimia-crimson)]/50 group-hover:bg-[var(--nimia-crimson)]/10">
        <Icon className="h-5 w-5 text-[var(--nimia-pink)]" strokeWidth={1.5} aria-hidden="true" />
      </div>

      <h3 className="nimia-font-display relative mt-5 text-xl font-bold sm:text-2xl">{title}</h3>
      <p className="relative mt-3 text-sm leading-relaxed text-[var(--nimia-muted)] sm:text-[15px]">
        {description}
      </p>

      <div className="relative mt-7 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
          Services
        </p>
        <ul className="mt-3 space-y-2.5">
          {items.map((label) => (
            <li key={label} className="flex items-center gap-2.5 text-sm text-[var(--foreground)]/85">
              <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--nimia-pink)]" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 flex items-center gap-2 text-sm font-semibold text-[var(--nimia-pink)]">
        <span className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
          Explore Service
        </span>
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
