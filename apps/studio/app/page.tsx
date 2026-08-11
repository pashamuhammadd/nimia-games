import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { buttonVariants, cn } from "@nimia/ui";
import { Play, Rocket, Smile, Wrench, Headphones } from "lucide-react";
import { PublicNavbar } from "./components/PublicNavbar";
import { Footer } from "./components/Footer";
import { StartProjectButton } from "./components/StartProjectButton";
import { TypedHeroHeadline } from "./components/TypedHeroHeadline";
import { ToolsSection } from "./components/home/ToolsSection";

// SEO fix, 10 Agustus 2026 — this page had NO metadata export at all, so
// it fell all the way back to the root layout's generic dashboard-oriented
// description ("Client portal, order system, project management, and
// invoicing for Nimia Games.") for its own <meta description> — wrong for
// the single most important page on the site. No `title` here on purpose:
// the root layout's `title.default` ("Nimia Studio - Animation, Game
// Development & Digital Assets") is already the correct homepage title, so
// setting one here would just run it through the "%s | Nimia Studio"
// template and duplicate the brand name. `openGraph`/`twitter` are left
// unset too, for the same reason — they fully inherit the root layout's
// (also homepage-appropriate) versions instead of being redefined here.
export const metadata: Metadata = {
  description:
    "Nimia Studio turns your ideas into professional, polished animation, games, and digital assets. Get an instant estimate, track production, and pay securely — all from your own project dashboard.",
  alternates: {
    canonical: "/",
  },
};

// Placeholder numbers (confirmed with the user 29 Juli 2026 — these are
// the reference design's example figures, not verified Nimia Games data
// yet). Swap in the real numbers whenever you have them.
const STATS = [
  { icon: Rocket, value: "100+", label: "Projects Completed" },
  { icon: Smile, value: "50+", label: "Happy Clients" },
  { icon: Wrench, value: "7+", label: "Years Experience" },
  { icon: Headphones, value: "24/7", label: "Support" },
];

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Removed the old `if (user) redirect("/dashboard")` guard here (11
  // Agustus 2026, per user bug report) — it made this page unreachable for
  // signed-in clients, so the dashboard's new "Back to Home" CTA
  // (GreetingHeader.tsx, added earlier the same day) just bounced straight
  // back to /dashboard instead of showing the marketing homepage. Every
  // OTHER public page in this app (services/page.tsx, portfolio, etc.)
  // already follows the pattern used below — render normally for everyone
  // and pass `isAuthenticated={!!user}` down so PublicNavbar/StartProjectButton
  // adapt (e.g. "Start a Project" goes straight to /order instead of
  // opening the login modal) — this page just hadn't been brought in line
  // with that pattern yet. If a signed-in user lands here (via this CTA, a
  // bookmark, or typing the bare domain), they now see the same homepage a
  // logged-out visitor does, just with CTAs pointed at the right place.
  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main>
        {/* HERO — redesigned 10 Agustus 2026 per user brief: outcome-focused
            copy ("turn your idea into something extraordinary" rather than
            a services list), stronger typographic hierarchy on the
            headline, premium CTA micro-interactions, and a more dynamic
            (but still performant, CSS-only) hero visual. Only this section
            and the section right below it (TOOLS) changed — everything
            else on this page, and every other route, is untouched. */}
        <section className="relative overflow-hidden">
          {/* Ambient glow blobs, purely decorative */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[var(--nimia-crimson)]/20 blur-[120px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-[var(--nimia-pink)]/10 blur-[120px]"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-10 lg:pb-10">
            <div>
              {/* Eyebrow rewritten 10 Agustus 2026 — was a 3-service label
                  ("Digital Assets • Animation • Game Development"); the
                  brief asked for outcome-first positioning instead of a
                  services list, so this now reads as an invitation rather
                  than a category tag. The services themselves still show up
                  in the subheading just below. */}
              <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
                Every Great Project Starts With An Idea
              </span>

              {/* Typing animation kept as-is (3 Agustus 2026 feature,
                  unchanged mechanism) — only the copy/coloring/size inside
                  components/TypedHeroHeadline.tsx changed for this
                  redesign. */}
              <TypedHeroHeadline />

              <p className="mt-5 max-w-lg text-lg text-[var(--nimia-muted)]">
                Animation, digital assets, games, and interactive experiences,
                crafted to feel{" "}
                <strong className="font-semibold text-[var(--nimia-pink)]">
                  polished, professional, and ready for the spotlight
                </strong>
                .
              </p>

              {/* CTAs: same two actions, same routing/functionality as
                  before — StartProjectButton still opens the sitewide login
                  modal when signed out (3 Agustus 2026 mechanism, see that
                  component), "View Our Work" still links to /portfolio.
                  Only the visual treatment changed (10 Agustus 2026):
                  primary CTA now uses .nimia-cta-gradient (the same
                  animated sheen already used on the Why Nimia closing CTA
                  and the /partners CTA) instead of a flat fill, plus a
                  hover scale + glow-shadow micro-interaction on both
                  buttons and a nudge-right on the secondary button's icon. */}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <StartProjectButton
                  isAuthenticated={!!user}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "nimia-cta-gradient border-0 text-white shadow-[0_18px_45px_-15px_rgba(193,18,77,0.65)] transition-transform duration-300 ease-out hover:scale-[1.045] active:scale-[0.98]",
                  )}
                >
                  Start a Project
                </StartProjectButton>
                <Link
                  href="/portfolio"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "group gap-2 border-[var(--foreground)]/30 transition-all duration-300 ease-out hover:scale-[1.03] hover:border-[var(--nimia-pink)]/70 hover:bg-[var(--nimia-surface-hover)] hover:shadow-[0_0_35px_-12px_rgba(255,77,141,0.55)]",
                  )}
                >
                  View Our Work
                  <Play
                    className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              {/* Stats — restyled 10 Agustus 2026 (thin vertical rules
                  instead of circle-icon "widget" boxes, so it reads as an
                  editorial detail under the CTAs rather than a dashboard
                  summary card). Same 4 figures, same placeholder-data
                  caveat as before (29 Juli 2026 note). Plain 2-col grid on
                  mobile (no dividers — a 2x2 grid can't divide cleanly by
                  DOM order alone once it wraps), a single divided row from
                  `sm:` up once there's room for all 4 side by side. */}
              <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-6 sm:flex sm:flex-wrap sm:gap-0 sm:divide-x sm:divide-[var(--nimia-border)]">
                {STATS.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="sm:px-5 sm:first:pl-0">
                    <Icon className="h-4 w-4 text-[var(--nimia-pink)]/70" aria-hidden="true" />
                    <p className="nimia-font-display mt-1.5 text-2xl font-bold sm:text-3xl">{value}</p>
                    <p className="text-xs text-[var(--nimia-muted)]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual — same Nimia mark + 3D float as before (29 Juli
                2026 mechanism, .nimia-hero-mark in globals.css, unchanged),
                now with two purely decorative additions for a more dynamic/
                cinematic feel per the 10 Agustus 2026 brief: a slow-spinning
                conic gradient ring, and a handful of floating particle dots
                (both reuse existing CSS keyframes already defined in
                globals.css — nimia-ring-spin is new, nimia-particle-float
                already existed for the /services card visuals). Both are
                `motion-safe:`-gated the same way, so prefers-reduced-motion
                visitors just see the static mark + glow, same as before. */}
            <div
              className="relative mx-auto flex max-w-md items-center justify-center py-2"
              style={{ perspective: "1200px" }}
            >
              <div
                aria-hidden="true"
                className="absolute h-72 w-72 rounded-full bg-[var(--nimia-crimson)]/25 blur-[80px]"
              />
              <div
                aria-hidden="true"
                className="motion-safe:animate-[nimia-ring-spin_16s_linear_infinite] absolute h-80 w-80 rounded-full opacity-40"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, var(--nimia-pink) 60deg, transparent 140deg, var(--nimia-crimson) 220deg, transparent 300deg, transparent 360deg)",
                  maskImage: "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 69%)",
                  WebkitMaskImage:
                    "radial-gradient(circle, transparent 62%, black 63%, black 68%, transparent 69%)",
                }}
              />
              {[
                { top: "8%", left: "12%", delay: "0s", duration: "4.5s" },
                { top: "18%", left: "82%", delay: "0.7s", duration: "5.2s" },
                { top: "78%", left: "10%", delay: "1.3s", duration: "4.8s" },
                { top: "86%", left: "78%", delay: "0.4s", duration: "5.6s" },
                { top: "48%", left: "4%", delay: "1.8s", duration: "5s" },
              ].map((p, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{ top: p.top, left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
                  className="motion-safe:animate-[nimia-particle-float_4s_ease-in-out_infinite] absolute h-1.5 w-1.5 rounded-full bg-[var(--nimia-pink)]/70 shadow-[0_0_8px_2px_rgba(255,77,141,0.5)]"
                />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element -- see
                  PublicNavbar.tsx for the same fixed-local-asset rationale */}
              <img
                src="/nimia-mark-hero.png"
                alt="Nimia Games mark"
                className="nimia-hero-mark relative z-10 w-full max-w-sm"
              />
            </div>
          </div>
        </section>

        {/* TOOLS — redesigned 10 Agustus 2026, see
            components/home/ToolsSection.tsx for the full rationale. Replaces
            the old "Trusted by innovative studios & brands" section, which
            rendered 5 literal dashed boxes reading "Partner" as an
            unresolved placeholder (29 Juli 2026 note) — this now shows real
            software/tool logos instead, with copy that doesn't claim any
            partnership/sponsorship relationship. */}
        <ToolsSection />

        {/* Recent Work and the Services teaser were removed from the home
            page (29 Juli 2026, per user request) — that content moved off
            the home page into the navbar instead: /services already
            existed as a full listing (see app/services/page.tsx), and
            /why-nimia, /portfolio, /contact were added the same day as
            part of the 5-item navbar expansion. /why-nimia and /portfolio
            are still minimal "coming soon" placeholders pending real
            content from the user. /contact (a contact form) was removed
            entirely on 30 Juli 2026 and replaced by /how-to-start, a full
            guide to Nimia Studio's order process — see
            app/how-to-start/page.tsx.

            A premium 3-card Services section (ServicesSection.tsx, see
            app/components/services/) was briefly added here too later the
            same day, then moved to live at /services instead per user
            correction — the brief was about that route, not the home page.
            Don't re-add it here without checking with the user first. */}
      </main>

      <Footer />
    </div>
  );
}
