import Link from "next/link";
import { MotionFrameLogo } from "../brand/MotionFrameLogo";
import { Footer } from "../Footer";
import { FULL_PORTFOLIO_URL } from "../../portfolio/data";

// The new nav only links to on-page sections, so the existing studio pages
// stay reachable from here. The legal row/copyright is the shared Footer,
// unchanged: legal identity is still undecided (01-KEPUTUSAN C2), so no new
// legal claims are written in this stage.
const EXPLORE_LINKS = [
  { href: FULL_PORTFOLIO_URL, label: "Full portfolio", external: true },
  { href: "/services", label: "Services", external: false },
  { href: "/how-to-start", label: "How to start", external: false },
  { href: "/why-nimia", label: "Why Nimia", external: false },
];

export function HomeFooter() {
  return (
    <div className="border-t border-[var(--orchid-border)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-4 pt-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <MotionFrameLogo height={34} className="h-[34px] w-auto self-start md:self-auto" />
        <nav aria-label="Explore" className="flex flex-wrap gap-x-6 gap-y-1">
          {EXPLORE_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--orchid-muted)] hover:text-[var(--orchid-text)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--orchid-muted)] hover:text-[var(--orchid-text)]"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <Footer />
    </div>
  );
}
