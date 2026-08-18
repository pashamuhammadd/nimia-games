import Link from "next/link";
import { ExternalLink } from "lucide-react";

const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com";

const EXPLORE_LINKS = [
  { href: `${STUDIO_URL}/`, label: "Home" },
  { href: `${STUDIO_URL}/why-nimia`, label: "Why Nimia" },
  { href: `${STUDIO_URL}/services`, label: "Services" },
  { href: "/", label: "Portfolio" },
  { href: `${STUDIO_URL}/how-to-start`, label: "How to Start" },
];

const PORTFOLIO_LINKS = [
  { href: "/", label: "All Works" },
  { href: "/?category=2d-animation", label: "2D Animation" },
  { href: "/?category=gifs-loops", label: "GIFs & Loops" },
  { href: "/?category=cinematic", label: "Cinematic" },
  { href: "/?category=long-form", label: "Long Form" },
  { href: "/?format=1:1", label: "1:1" },
  { href: "/?format=16:9", label: "16:9" },
  { href: "/?format=9:16", label: "9:16" },
];

const SUPPORT_LINKS = [
  { href: `${STUDIO_URL}/how-to-start`, label: "FAQ" },
  { href: `${APP_URL}/dashboard/support`, label: "Contact Us" },
  { href: `${WWW_URL}/terms`, label: "Terms of Service" },
  { href: `${WWW_URL}/privacy`, label: "Privacy Policy" },
];

// Compact, elegant closing footer (spec §24) — sections mirror the ones
// listed in the brief exactly. Every link routes back to the main studio
// site or within this app's own filter query params (no dead pages
// created just to host a footer link).
export function Footer() {
  return (
    <footer className="border-t border-[var(--nimia-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
        <div>
          <span className="nimia-font-display text-lg font-bold tracking-wide text-white">
            NIMIA <span className="nimia-gradient-text">STUDIO</span>
          </span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--nimia-muted)]">
            An independent animation and game production studio, crafting original animation, cinematics, and
            digital assets for clients and worlds of our own.
          </p>
        </div>

        <FooterColumn title="Explore" links={EXPLORE_LINKS} />
        <FooterColumn title="Portfolio" links={PORTFOLIO_LINKS} />

        <div>
          <FooterColumn title="Support" links={SUPPORT_LINKS} />
          <div className="mt-8 rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] p-5">
            <p className="nimia-font-display text-base font-bold text-white">Let&apos;s Create Something Amazing</p>
            <p className="mt-1.5 text-xs text-[var(--nimia-muted)]">Ready to bring your idea to life?</p>
            <a
              href={`${APP_URL}/order`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--nimia-pink)] transition-colors hover:text-white"
            >
              Start a Project <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--nimia-border)] px-4 py-5 sm:px-6">
        <p className="mx-auto max-w-6xl text-xs text-[var(--nimia-muted)]">
          &copy; {new Date().getFullYear()} Nimia Games. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{title}</p>
      <nav className="mt-4 flex flex-col gap-2.5">
        {links.map((link) =>
          link.href.startsWith("/") ? (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-[var(--nimia-muted)] transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-1 text-sm text-[var(--nimia-muted)] transition-colors hover:text-white"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ),
        )}
      </nav>
    </div>
  );
}
