"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Clapperboard, Gamepad2, Globe } from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import { AnimationVisual, GameDevVisual, WebsiteVisual } from "./visuals";

// Premium "Services" page content (29 Juli 2026 brief), rendered at
// /services (app/services/page.tsx) — REPLACES the previous dynamic,
// Supabase-backed full listing there. Exactly 3 flagship services in
// priority order: 2D Animation, Game Development, Website Development. This
// is a fixed, hand-curated set with the exact copy/order/count the user
// specified — it intentionally never grows past 3 cards, and is NOT tied to
// the `services` database table.
//
// "Explore Service" links to /dashboard/orders (the generic order form,
// which lets the buyer pick any service from a dropdown) rather than
// preselecting a specific database row: only "2D Animation" has an exact
// 1:1 match in the `services` table, "Game Development" and "Website
// Development" don't exist there as literal rows, so there's no reliable
// service id to preselect for those two. Revisit this once dedicated
// service rows (or per-category pages) exist.
const SERVICES = [
  {
    title: "2D Animation",
    description:
      "Bring your ideas to life through expressive animations designed for games, brands, and digital products.",
    items: ["Character Animation", "Motion Graphics", "Logo Animation", "Explainer Video"],
    icon: Clapperboard,
    visual: AnimationVisual,
    href: "/dashboard/orders",
  },
  {
    title: "Game Development",
    description: "Build engaging games from concept to production using modern technologies.",
    items: ["Unity Development", "Mobile Game", "Multiplayer", "Game Prototype"],
    icon: Gamepad2,
    visual: GameDevVisual,
    href: "/dashboard/orders",
  },
  {
    title: "Website Development",
    description:
      "Design and build modern websites that are fast, beautiful, and optimized for business growth.",
    items: ["Landing Page", "Company Website", "Dashboard", "Web App"],
    icon: Globe,
    visual: WebsiteVisual,
    href: "/dashboard/orders",
  },
] as const;

export function ServicesSection() {
  const shouldReduceMotion = useReducedMotion();

  const headingContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.05 },
    },
  };
  const headingItem: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  // Cards get their own stagger group, one level below the heading group,
  // plus a short blur-in on top of the usual fade/rise (per brief: "sedikit
  // blur transition" on entrance) — skipped entirely for reduced motion.
  const cardContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.1 },
    },
  };
  const cardItem: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      {/* Ambient glow, same visual language as the hero / Why Nimia sections */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <motion.div
        variants={headingContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <motion.span
          variants={headingItem}
          className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]"
        >
          Services
        </motion.span>
        <motion.h2
          variants={headingItem}
          className="nimia-font-display mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          What We Build
        </motion.h2>
        <motion.p
          variants={headingItem}
          className="mx-auto mt-5 max-w-2xl text-lg text-[var(--nimia-muted)]"
        >
          From high-quality animations to complete game development and modern
          websites, we help businesses and studios build exceptional digital
          experiences.
        </motion.p>
      </motion.div>

      {/* `lg:auto-rows-fr` keeps all 3 cards the same height on desktop even
          though their content lengths differ slightly (per brief: "Setiap
          card memiliki ukuran yang sama"). Single column below `lg`. */}
      <motion.div
        variants={cardContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto mt-16 grid max-w-6xl gap-6 sm:mt-20 lg:auto-rows-fr lg:grid-cols-3 lg:gap-8"
      >
        {SERVICES.map((service) => (
          <motion.div key={service.title} variants={cardItem} className="h-full">
            <ServiceCard
              title={service.title}
              description={service.description}
              items={service.items}
              icon={service.icon}
              visual={service.visual}
              href={service.href}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
