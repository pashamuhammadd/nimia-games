"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, UserPlus, Share2, Gift, Crown } from "lucide-react";
import type { ReactNode } from "react";
import { PARTNER_LEVELS, FOUNDING_PARTNER_QUOTA, FOUNDING_PARTNER_LEVEL, FOUNDING_PARTNER_COMMISSION_RATE } from "@/modules/partners";

// Content for the Nimia Partner Program's public marketing page (see
// page.tsx for the full context on why this route exists). Every number
// on this page (commission rates, level thresholds, Founding Partner
// quota) is imported from modules/partners/constants instead of
// hand-typed here — those constants are already the single source of
// truth shared with the authenticated Dashboard > Partners page and the
// admin Partners directory (see partner-level.ts's own header comment on
// why duplicating these by hand is exactly what NOT to do).
//
// Kept as one file (unlike why-nimia/services, which split each section
// into its own component) since this page has fewer, simpler sections and
// isn't expected to grow the same way those content-heavy pages did.
//
// GOLD_LEVEL / GOLD_RATE_PERCENT (10 Agustus 2026, per user decision):
// anyone who registers through THIS page starts at Gold (10%) immediately
// instead of the normal Bronze (5%) everyone else starts at — a FLOOR, not
// a lock, so referring 15+ paid clients still carries them on to Platinum
// (12%). The actual override lives server-side
// (packages/db/migrations/0030_partner_page_signup_bonus.sql +
// utils/level-calculator.ts#resolvePartnerLevel) — this page's job is just
// to promise it correctly and pass `?via=partners` through to /register so
// signUpAction knows to apply it. GOLD_LEVEL is derived from PARTNER_LEVELS
// (not hand-typed as "gold") so this page can't silently drift from the
// real ladder if it's ever reordered.
// GOLD_LEVEL reuses FOUNDING_PARTNER_LEVEL ("gold") rather than hand-typing
// the string — Founding Partner's target tier and this page's starting
// tier are the same tier by design (both are the Gold-rate floor/lock),
// so there's already a constant for exactly this.
const GOLD_LEVEL = FOUNDING_PARTNER_LEVEL;
const GOLD_RATE_PERCENT = Math.round(FOUNDING_PARTNER_COMMISSION_RATE * 100);
const PLATINUM_RATE_PERCENT = Math.round(PARTNER_LEVELS[PARTNER_LEVELS.length - 1].commissionRate * 100);

function fadeUp(shouldReduceMotion: boolean | null): Variants {
  return {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };
}

function PartnerCta({
  isAuthenticated,
  className,
  children,
}: {
  isAuthenticated: boolean;
  className?: string;
  children: ReactNode;
}) {
  // Deliberately NOT StartProjectButton — that component always resolves
  // to /order (with a login modal for signed-out visitors), which is the
  // wrong destination here. A signed-out visitor becoming a partner needs
  // /register (there's no separate partner login step), and a signed-in
  // visitor is sent straight to their own referral link/stats rather than
  // back through registration.
  //
  // "?via=partners" (10 Agustus 2026) is what actually triggers the Gold
  // floor — app/register/page.tsx reads it, RegisterForm.tsx carries it as
  // a hidden field, and app/actions.ts#signUpAction forwards it into
  // auth.signUp() metadata for handle_new_auth_user() to read. Without
  // this query param, signing up would be indistinguishable from a plain
  // /register visit and would start at the normal Bronze rate instead.
  return (
    <Link href={isAuthenticated ? "/dashboard/partners" : "/register?via=partners"} className={className}>
      {children}
    </Link>
  );
}

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/20 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-10 h-[26rem] w-[26rem] rounded-full bg-[var(--nimia-pink)]/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 0%, black, transparent)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-4xl text-center"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300"
        >
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          Start at Gold — {GOLD_RATE_PERCENT}% Commission
        </motion.span>

        <motion.h1
          variants={item}
          className="nimia-font-display mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Introduce Clients.
          <br />
          <span className="nimia-gradient-text">Earn Rewards.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-lg text-[var(--nimia-muted)] sm:text-xl"
        >
          Sign up through this page and you start immediately at Gold — {GOLD_RATE_PERCENT}% commission
          from day one, no need to build up through Bronze or Silver first. Keep referring paying
          clients and you can still climb all the way to Platinum ({PLATINUM_RATE_PERCENT}%).
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-col items-center gap-4">
          <PartnerCta
            isAuthenticated={isAuthenticated}
            className="nimia-cta-gradient group inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white shadow-[0_20px_60px_-15px_rgba(193,18,77,0.55)] transition-transform hover:scale-[1.03]"
          >
            {isAuthenticated ? "Go to Your Partner Dashboard" : "Become a Partner — It's Free"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </PartnerCta>

          <p className="text-xs font-medium uppercase tracking-widest text-[var(--nimia-muted)]">
            {GOLD_RATE_PERCENT}% commission from day one · Auto-enrolled at signup · Grows to{" "}
            {PLATINUM_RATE_PERCENT}% at Platinum
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your free account",
    body: `Sign up through this page and you're automatically a partner, starting at Gold (${GOLD_RATE_PERCENT}%) — there's no separate application or approval step to wait on.`,
  },
  {
    icon: Share2,
    title: "Share your referral link",
    body: "Every partner gets a permanent, unique referral link from Dashboard > Partners. Share it with studios, communities, or anyone who might need Nimia's work.",
  },
  {
    icon: Gift,
    title: "Earn when they become a client",
    body: "Once someone you referred pays for a project, a reward is credited to your account automatically — tracked live from your own dashboard.",
  },
];

function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        variants={fadeUp(shouldReduceMotion)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="nimia-font-display text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--nimia-muted)]">
          Three steps, all of them automatic — nothing to apply for, nothing to configure.
        </p>
      </motion.div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              variants={fadeUp(shouldReduceMotion)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nimia-crimson)]/15">
                <Icon className="h-5 w-5 text-[var(--nimia-pink)]" aria-hidden="true" />
              </span>
              <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-[var(--nimia-muted)]">
                Step {index + 1}
              </span>
              <h3 className="mt-1.5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-[var(--nimia-muted)]">{step.body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function CommissionTiers() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        variants={fadeUp(shouldReduceMotion)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="nimia-font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Grow Your <span className="nimia-gradient-text">Commission</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--nimia-muted)]">
          Sign up through this page and you start at Gold — already ahead of the normal ladder. Refer
          15+ paying clients and you'll still climb to Platinum.
        </p>
      </motion.div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
        {PARTNER_LEVELS.map((level, index) => {
          const isStartingTier = level.level === GOLD_LEVEL;
          return (
            <motion.div
              key={level.level}
              variants={fadeUp(shouldReduceMotion)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.08 }}
              className={
                isStartingTier
                  ? "flex flex-col gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] p-5"
                  : "flex flex-col gap-2 rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] p-5"
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">
                  {level.emoji}
                </span>
                {isStartingTier ? (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                    You start here
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold">{level.label}</p>
              <p className="text-xs text-[var(--nimia-muted)]">
                {level.maxPaidClients === null
                  ? `${level.minPaidClients}+ paid clients`
                  : `${level.minPaidClients}–${level.maxPaidClients} paid clients`}
              </p>
              <p className="text-lg font-bold text-[var(--nimia-pink)]">
                {Math.round(level.commissionRate * 100)}%
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function FoundingPartnerCallout() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative px-4 py-4 sm:px-6">
      <motion.div
        variants={fadeUp(shouldReduceMotion)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto flex max-w-4xl flex-col items-start gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
          <Crown className="h-6 w-6 text-amber-300" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            On top of that: Founding Partner
          </p>
          <p className="mt-1 text-lg font-semibold">
            The first {FOUNDING_PARTNER_QUOTA} accounts to ever join get Gold commission locked in for
            life.
          </p>
          <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">
            The Gold rate above is a floor — it can still grow to Platinum with enough referrals. If
            you're also among the first {FOUNDING_PARTNER_QUOTA} partners overall, Founding Partner
            status takes over instead: the same {GOLD_RATE_PERCENT}% rate, but permanent, regardless of
            how many clients you go on to refer.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "What commission rate do I start at?",
    a: `Signing up through studio.nimiagames.com/partners starts you at Gold (${GOLD_RATE_PERCENT}%) immediately — no need to build up through Bronze or Silver. Refer 15+ paying clients and you'll still climb to Platinum (${PLATINUM_RATE_PERCENT}%).`,
  },
  {
    q: "Do I need to apply, or is anyone approved automatically?",
    a: "Everyone is enrolled automatically the moment you create a Nimia Studio account — there's no separate application, review, or waiting period.",
  },
  {
    q: "Is there a cost to join?",
    a: "No. The Partner Program is completely free — there's nothing to pay and nothing to sell to become a partner.",
  },
  {
    q: "How do I find my referral link?",
    a: "Once you're signed in, your permanent referral link and code are on the Partners page in your dashboard, along with your referral activity and reward balance.",
  },
  {
    q: "When do rewards show up?",
    a: "A reward is credited the moment someone you referred pays for a project, and moves to \"available\" once that project is complete. You can track both from your dashboard at any time.",
  },
];

function Faq() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        variants={fadeUp(shouldReduceMotion)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto max-w-3xl"
      >
        <h2 className="nimia-font-display text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Common Questions
        </h2>
        <div className="mt-10 flex flex-col gap-4">
          {FAQ_ITEMS.map((faqItem) => (
            <div
              key={faqItem.q}
              className="rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] p-5"
            >
              <p className="text-sm font-semibold">{faqItem.q}</p>
              <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">{faqItem.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function ClosingCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <motion.div
        variants={fadeUp(shouldReduceMotion)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="nimia-font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Know Someone Who Needs
          <br />
          <span className="nimia-gradient-text">Nimia Studio?</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[var(--nimia-muted)] sm:text-lg">
          Create your free account, start at Gold, and start earning — it takes less time than reading
          this page.
        </p>
        <div className="mt-9">
          <PartnerCta
            isAuthenticated={isAuthenticated}
            className="nimia-cta-gradient group inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white shadow-[0_20px_60px_-15px_rgba(193,18,77,0.55)] transition-transform hover:scale-[1.03]"
          >
            {isAuthenticated ? "Go to Your Partner Dashboard" : "Become a Partner — It's Free"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </PartnerCta>
        </div>
      </motion.div>
    </section>
  );
}

export function PartnersMarketingExperience({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <main className="relative">
      <Hero isAuthenticated={isAuthenticated} />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <HowItWorks />
      <div className="mx-auto h-px max-w-6xl bg-[var(--nimia-border)]" />
      <CommissionTiers />
      <FoundingPartnerCallout />
      <div className="mx-auto mt-8 h-px max-w-6xl bg-[var(--nimia-border)]" />
      <Faq />
      <ClosingCta isAuthenticated={isAuthenticated} />
    </main>
  );
}
