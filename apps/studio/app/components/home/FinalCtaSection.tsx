import { Send } from "lucide-react";
import { StartProjectButton } from "../StartProjectButton";
import { resolveTelegramHelpUrl } from "./links";

// NEXT_PUBLIC_* is inlined at build time; the link only appears once the
// studio's own Telegram URL is configured (see links.ts).
const TELEGRAM_HELP_URL = resolveTelegramHelpUrl(process.env.NEXT_PUBLIC_STUDIO_TELEGRAM_URL);

export function FinalCtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden border-t border-[var(--orchid-border)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-[50%] bg-[var(--orchid-pink)]/20 blur-[90px]"
      />
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <h2 id="cta-title" className="orchid-display max-w-[16ch] text-[clamp(2.25rem,5.5vw,3.5rem)]">
          Your next big idea starts here.
        </h2>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <StartProjectButton isAuthenticated={isAuthenticated} className="orchid-btn orchid-btn-primary">
            Start a project
          </StartProjectButton>
          {TELEGRAM_HELP_URL ? (
            <a
              href={TELEGRAM_HELP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-3 rounded-full text-[var(--orchid-text)] hover:text-[var(--orchid-pink)]"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm leading-tight">
                Questions?
                <br />
                <span className="font-semibold">Chat on Telegram</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
