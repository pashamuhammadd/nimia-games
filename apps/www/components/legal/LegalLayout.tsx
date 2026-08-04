import type { ReactNode } from "react";
import FlowShell from "@/components/flow/FlowShell";
import Reveal from "@/components/motion/Reveal";
import Footer from "@/components/layout/Footer";

interface LegalLayoutProps {
  eyebrow: string;
  title: ReactNode;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}

/**
 * Shared shell for the legal pages (Privacy Policy, Terms of Service,
 * Refund & Cancellation Policy). Keeps the same header treatment and card
 * styling as the rest of the marketing site (see AboutSection/ContactPage)
 * so these read as part of the site, not a bolted-on legal template.
 */
export default function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  intro,
  children,
}: LegalLayoutProps) {
  return (
    <FlowShell>
      <div className="px-5 pb-10 md:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
              {eyebrow}
            </p>

            <h1 className="max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
              {title}
            </h1>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/35">
              Last updated: {lastUpdated}
            </p>

            {intro && (
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                {intro}
              </p>
            )}
          </Reveal>

          <Reveal delay={100} className="mt-8">
            <div className="nimia-card space-y-8 rounded-2xl p-6 md:p-10">
              {children}
            </div>
          </Reveal>
        </div>
      </div>

      <Footer />
    </FlowShell>
  );
}

interface LegalSectionProps {
  id?: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-base font-black text-white md:text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-white/60 md:text-base">
        {children}
      </div>
    </section>
  );
}
