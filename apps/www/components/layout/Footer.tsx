import FlowLink from "@/components/flow/FlowLink";

// Slim closing footer. The main site navigation now lives in the Navbar
// and the FlowNav next/back buttons, so this only needs the essentials:
// copyright, legal links, and the external link to the production studio
// site.
export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Nimia Games. All rights reserved.</p>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <FlowLink href="/privacy" className="transition hover:text-white">
            Privacy Policy
          </FlowLink>
          <FlowLink href="/terms" className="transition hover:text-white">
            Terms of Service
          </FlowLink>
          <FlowLink
            href="/refund-policy"
            className="transition hover:text-white"
          >
            Refund Policy
          </FlowLink>
          <a
            href="https://nimiastudio.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            Nimia Studio ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
