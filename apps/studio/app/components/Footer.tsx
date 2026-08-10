import Link from "next/link";
import { ExternalLink } from "lucide-react";

// Slim closing footer for studio.nimiagames.com's public/marketing pages
// (added 9 Agustus 2026, launch-readiness audit finding — this app is where
// clients actually create accounts, submit orders, and pay, but until now
// had zero links to Privacy Policy / Terms of Service / Refund Policy
// anywhere. Those pages only exist on apps/www (see
// apps/www/app/{privacy,terms,refund-policy}/page.tsx, linked from
// apps/www/components/layout/Footer.tsx) — there's no local copy here, so
// this links out to the marketing site rather than duplicating that
// content. NEXT_PUBLIC_WWW_URL falls back to the production marketing
// domain so this works even where the env var isn't set (local dev,
// preview deploys).
//
// Deliberately NOT added to modules/order's Project Configurator (the
// full-screen wizard at /order) — that flow already gets its own Terms
// link directly on the Review step's agreement checkbox (see
// modules/order/components/review-section.tsx), which is the more
// relevant place for it while someone's mid-checkout; a footer there would
// just be extra chrome around a deliberately distraction-free flow.
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";

const LEGAL_LINKS = [
  { href: `${WWW_URL}/privacy`, label: "Privacy Policy" },
  { href: `${WWW_URL}/terms`, label: "Terms of Service" },
  { href: `${WWW_URL}/refund-policy`, label: "Refund Policy" },
];

// Partner Program link (10 Agustus 2026, launch-readiness audit fix) —
// internal (this app's own /partners page, see app/partners/page.tsx), so
// a plain next/link, not an external <a> like LEGAL_LINKS above. Kept
// separate from that array on purpose: it's not a legal document, and it
// shouldn't get the same ExternalLink icon since it doesn't leave this app.
const PARTNER_LINK = { href: "/partners", label: "Partner Program" };

export function Footer() {
  return (
    <footer className="border-t border-[var(--nimia-border)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-[var(--nimia-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Nimia Games. All rights reserved.</p>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link
            href={PARTNER_LINK.href}
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
          >
            {PARTNER_LINK.label}
          </Link>
          {LEGAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
