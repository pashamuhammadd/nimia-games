import { ExternalLink } from "lucide-react";

// Copied from apps/studio's Footer.tsx (14 Agustus 2026 dashboard split —
// see [[studio_multi_app_split_plan]]) and adapted: /partners no longer
// exists in this app, so that link has to be an absolute cross-origin URL
// back to the marketing site instead of a local `next/link`, same reasoning
// as this app's own PublicNavbar.tsx copy.
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";

const LEGAL_LINKS = [
  { href: `${WWW_URL}/privacy`, label: "Privacy Policy" },
  { href: `${WWW_URL}/terms`, label: "Terms of Service" },
  { href: `${WWW_URL}/refund-policy`, label: "Refund Policy" },
];

const PARTNER_LINK = { href: `${STUDIO_URL}/partners`, label: "Partner Program" };

export function Footer() {
  return (
    <footer className="border-t border-[var(--nimia-border)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-[var(--nimia-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Nimia Games. All rights reserved.</p>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <a
            href={PARTNER_LINK.href}
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)]"
          >
            {PARTNER_LINK.label}
          </a>
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
