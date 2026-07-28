// Slim closing footer. The main site navigation now lives in the Navbar
// and the FlowNav next/back buttons, so this only needs the essentials:
// copyright and the external link to the production studio site.
export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 text-[11px] text-white/40 sm:flex-row sm:items-center">
        <p>© 2026 Nimia Games. All rights reserved.</p>

        <a
          href="https://studio.nimiagames.com"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-white"
        >
          Nimia Studio ↗
        </a>
      </div>
    </footer>
  );
}
