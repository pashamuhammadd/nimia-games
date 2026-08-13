import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PublicNavbar } from "./components/PublicNavbar";
import { Footer } from "./components/Footer";
import { ToolsSection } from "./components/home/ToolsSection";
import { CreativeAgentSection } from "@/modules/creative-agent";

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
    "Tell Nimia Creative Agent what you want to create, and we'll turn your idea into a production-ready animation, game, or digital asset — no forms, no guesswork.",
  alternates: {
    canonical: "/",
  },
};

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Removed the old `if (user) redirect("/dashboard")` guard here (11
  // Agustus 2026, per user bug report) — it made this page unreachable for
  // signed-in clients. Every other public page in this app already
  // renders normally for everyone regardless of auth state; this page
  // follows the same pattern. `user` is only still read here because
  // PublicNavbar needs `isAuthenticated` to point its own "Start a
  // Project" CTA at the right place (straight to /order vs. opening the
  // login modal) — the Creative Agent itself works identically for every
  // visitor, logged in or not (brief §2: no login wall on the idea itself).
  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main>
        {/* HERO — replaced by the Nimia Creative Agent redesign (13 Agustus
            2026, per product brief). The previous hero (eyebrow badge,
            typing-animation headline, stats row, dual CTA, spinning-ring/
            particle/hero-mark visual — see git history) was a conventional
            SaaS landing pattern; the brief explicitly asks for the
            opposite: a very minimal initial viewport with exactly one
            focal element. Everything above the fold now is: brand
            (PublicNavbar, untouched) -> headline -> Creative Agent input.
            All copy/state/API-calls live in CreativeAgentSection
            (modules/creative-agent) — this file only supplies the two
            copy strings and the ambient background. */}
        <section className="relative overflow-hidden">
          {/* Ambient glow — trimmed to two very soft blobs (brand crimson +
              the new Creative Agent gold accent) per brief §17 ("dekorasi
              yang sangat halus... jangan membuat background terlalu
              ramai"). No spinning ring, no particles, no hero mark — those
              read as exactly the kind of decoration the brief asks to
              avoid on this page now. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[var(--nimia-crimson)]/15 blur-[130px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-[var(--nimia-gold)]/10 blur-[130px]"
          />

          <div className="relative mx-auto flex min-h-[78vh] max-w-4xl flex-col justify-center px-4 py-20 sm:px-6">
            <CreativeAgentSection
              headline="Tell us what you want to create."
              subtext="Have an idea but don't know exactly how to describe it? That's okay. Tell us what you have in mind, and our Creative Agent will help shape it into a production-ready project."
            />
          </div>
        </section>

        {/* TOOLS — unchanged by this redesign (10 Agustus 2026 section,
            see components/home/ToolsSection.tsx). The brief's minimalism
            rule is about the INITIAL viewport, not the whole page, so
            everything below the hero fold is untouched. */}
        <ToolsSection />

        {/* Recent Work and the Services teaser remain intentionally absent
            from the home page (29 Juli 2026, per user request) — see
            /services, /why-nimia, /portfolio, /how-to-start instead. */}
      </main>

      <Footer />
    </div>
  );
}
