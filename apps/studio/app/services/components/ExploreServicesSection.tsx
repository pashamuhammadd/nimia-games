"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { CORE_SERVICES, SERVICE_DETAILS } from "../data";

// Real 1:1 thumbnails (11 Agustus 2026, per user request; ratio corrected
// from 4:3 to 1:1 same day) — replaces the abstract SVG "ambient visual"
// (app/components/services/visuals.tsx) this section used to render here.
// Same next/image + `fill` inside an `aspect-[ratio]` container pattern
// modules/order/components/option-card.tsx already established for package
// thumbnails, just `aspect-square` instead of that component's
// `aspect-video` — matches the 1:1 size the user is preparing these images
// at (see SERVICE_DETAILS[].thumbnailSrc in ../data.ts).

// SECTION 3 — Explore Our Services. One large block per core service, in
// the same fixed order as Section 2, each carrying an id so the matching
// "Explore Service" card can smooth-scroll straight here.
export function ExploreServicesSection() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  const gridContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.1 },
    },
  };
  const gridItem: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          In Detail
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Explore Our Services
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          A closer look at what falls under each of our three core services.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-6xl space-y-20 sm:mt-20 sm:space-y-28">
        {SERVICE_DETAILS.map((block, index) => {
          const Icon = CORE_SERVICES.find((s) => s.id === block.id)?.icon;
          const visualFirst = index % 2 === 0;

          return (
            <div key={block.id} id={block.id} className="scroll-mt-24">
              <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className={visualFirst ? "md:order-1" : "md:order-2"}
                >
                  {Icon ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                      <Icon className="h-5 w-5 text-[var(--nimia-pink)]" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  ) : null}
                  <h3 className="nimia-font-display mt-5 text-2xl font-bold sm:text-3xl">
                    {block.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--nimia-muted)]">
                    {block.description}
                  </p>

                  {/* No border/background frame around this image (11
                      Agustus 2026, per user request) — the 3 thumbnails are
                      transparent artwork, not photos, so a visible
                      card/frame around them looked wrong. `object-contain`
                      instead of the previous `object-cover` so the full
                      transparent artwork always shows uncropped, regardless
                      of the exact pixel dimensions of the file the user
                      drops in.

                      Width capped at 65% of the column (11 Agustus 2026,
                      later same day — user said the images were rendering
                      too large, ~35% smaller requested). Was `w-full`
                      (filled the whole column); shrinking the WIDTH by 35%
                      is what actually reads as "35% smaller" — `aspect-square`
                      still drives the height off whatever width results, so
                      the thumbnail just gets proportionally smaller, not
                      cropped or stretched. Left-aligned within its column
                      (no `mx-auto`) so it stays flush with the heading/copy
                      above it, on whichever side (left or right) that
                      column falls per `visualFirst`. */}
                  <div className="relative mt-8 aspect-square w-[65%]">
                    <Image
                      src={block.thumbnailSrc}
                      alt={block.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 65vw"
                      className="object-contain"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={gridContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${visualFirst ? "md:order-2" : "md:order-1"}`}
                >
                  {block.items.map((label) => (
                    <motion.div
                      key={label}
                      variants={gridItem}
                      className="group flex items-center gap-2.5 rounded-xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)]/40 px-4 py-3.5 transition-colors duration-200 hover:border-[var(--nimia-crimson)]/40 hover:bg-[var(--nimia-crimson)]/[0.06]"
                    >
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-[var(--nimia-pink)]"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-[var(--foreground)]/90">{label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
