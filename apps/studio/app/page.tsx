import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { buttonVariants, cn } from "@nimia/ui";
import { Play, Rocket, Smile, Wrench, Headphones } from "lucide-react";
import { PublicNavbar } from "./components/PublicNavbar";
import { StartProjectButton } from "./components/StartProjectButton";

// Placeholder numbers (confirmed with the user 29 Juli 2026 — these are
// the reference design's example figures, not verified Nimia Games data
// yet). Swap in the real numbers whenever you have them.
const STATS = [
  { icon: Rocket, value: "100+", label: "Projects Completed" },
  { icon: Smile, value: "50+", label: "Happy Clients" },
  { icon: Wrench, value: "5+", label: "Years Experience" },
  { icon: Headphones, value: "24/7", label: "Support" },
];

// Also placeholder (confirmed with the user 29 Juli 2026): the reference
// design showed real engine/platform logos (Unity, Unreal, Solana, Steam,
// AWS) — using those without a real relationship would misrepresent an
// endorsement/partnership Nimia Games doesn't have, so this renders
// generic labeled slots instead until you tell me which logos are
// actually accurate to show here.
const TRUST_PLACEHOLDERS = ["Partner", "Partner", "Partner", "Partner", "Partner"];

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={false} />

      <main>
        {/* HERO */}
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
              {/* Reordered to lead with "Digital Assets" (29 Juli 2026, per
                  user feedback: hero should read as a digital-asset studio
                  first, game studio second — this and the headline/copy
                  below were reordered together; revert if you'd rather
                  keep "Game Development" first). */}
              <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
                Digital Assets &bull; Animation &bull; Game Development
              </span>

              <h1 className="nimia-font-display mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="nimia-gradient-text">Digital Assets</span> That Bring Ideas to Life
              </h1>

              <p className="mt-4 max-w-lg text-lg text-[var(--nimia-muted)]">
                Nimia Games Studio is a creative production studio specializing
                in <strong className="font-semibold text-[var(--nimia-pink)]">digital assets</strong>,{" "}
                <strong className="font-semibold text-[var(--nimia-pink)]">animation</strong>, and{" "}
                <strong className="font-semibold text-[var(--nimia-pink)]">game development</strong> for
                studios and brands worldwide.
              </p>

              {/* No arrow icon inside either CTA (29 Juli 2026, per user
                  feedback). "View Our Work" gets a stronger border than
                  the default outline variant for the same reason as the
                  navbar's Log in button — see PublicNavbar.tsx.
                  href now points at "/portfolio" (29 Juli 2026) — that
                  route now exists (part of the 5-item navbar expansion)
                  as a minimal "coming soon" page, since real portfolio
                  content is still pending from the user. Swap in specific
                  work later if you'd rather deep-link somewhere else.
                  "Start a Project" now uses StartProjectButton (3 Agustus
                  2026, per user request — modal login sitewide): this
                  branch of the page only ever renders with user === null
                  (see the redirect("/dashboard") above), so this is always
                  the signed-out state in practice, but isAuthenticated is
                  still passed through for correctness if that ever
                  changes. */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {/* bg/text/hover repeated here on top of buttonVariants()
                    as a safety net (29 Juli 2026) — see the @source note
                    in globals.css for why the "primary" variant's OWN
                    classes were silently not rendering in production. */}
                <StartProjectButton
                  isAuthenticated={!!user}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
                  )}
                >
                  Start a Project
                </StartProjectButton>
                <Link
                  href="/portfolio"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "gap-2 border-[var(--foreground)]/30 hover:border-[var(--nimia-pink)]/70 hover:bg-[var(--nimia-surface-hover)]",
                  )}
                >
                  View Our Work
                  <Play className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Shrunk further (29 Juli 2026, per user feedback) so this
                  row takes up less height and "Trusted by" sits higher. */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STATS.map(({ icon: Icon, value, label }) => (
                  <div key={label}>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--nimia-crimson)]/15 text-[var(--nimia-pink)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-lg font-bold">{value}</p>
                    <p className="text-xs text-[var(--nimia-muted)]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual: the Nimia mark itself, floating/tilting in place
                of a photo (the reference's character art was explicitly a
                style reference only, not a real asset — see user request
                29 Juli 2026). `perspective` on this wrapper is what makes
                the child's rotateY/rotateX in .nimia-hero-mark actually
                read as 3D instead of a flat skew. */}
            <div
              className="relative mx-auto flex max-w-md items-center justify-center py-2"
              style={{ perspective: "1200px" }}
            >
              <div
                aria-hidden="true"
                className="absolute h-72 w-72 rounded-full bg-[var(--nimia-crimson)]/25 blur-[80px]"
              />
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

        {/* TRUST (placeholder — see TRUST_PLACEHOLDERS note above) */}
        <section className="border-t border-[var(--nimia-border)] px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--nimia-muted)]">
              Trusted by innovative studios &amp; brands
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              {TRUST_PLACEHOLDERS.map((label, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-dashed border-[var(--nimia-border)] px-6 py-3 text-sm font-medium text-[var(--nimia-muted)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Work and the Services teaser were removed from the home
            page (29 Juli 2026, per user request) — that content moved off
            the home page into the navbar instead: /services already
            existed as a full listing (see app/services/page.tsx), and
            /why-nimia, /portfolio, /contact were added the same day as
            part of the 5-item navbar expansion. /why-nimia and /portfolio
            are still minimal "coming soon" placeholders pending real
            content from the user (see those files' own comments).
            /contact (a contact form) was removed entirely on 30 Juli 2026
            and replaced by /how-to-start, a full guide to Nimia Studio's
            order process — see app/how-to-start/page.tsx.

            A premium 3-card Services section (ServicesSection.tsx, see
            app/components/services/) was briefly added here too later the
            same day, then moved to live at /services instead per user
            correction — the brief was about that route, not the home page.
            Don't re-add it here without checking with the user first. */}
      </main>
    </div>
  );
}
