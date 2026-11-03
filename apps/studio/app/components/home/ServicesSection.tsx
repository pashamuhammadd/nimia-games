import { StartProjectButton } from "../StartProjectButton";

// Exactly two service lines (approved product decision). Each card wears
// one half of the Motion Frame mark: pink for Animation, violet for
// Development — the logo's own story of two crafts meeting.
const SERVICES = [
  {
    id: "animation",
    title: "Animation",
    description: "Original animation that gives your ideas movement, character, and heart.",
    examples: "Character animation, trailers, music videos, motion graphics.",
    tone: "text-[var(--orchid-pink)]",
    ring: "border-[var(--orchid-pink)]/60",
  },
  {
    id: "development",
    title: "Development",
    description: "Interactive experiences, games, and web products built to engage and last.",
    examples: "Websites, web apps, and game builds.",
    tone: "text-[var(--orchid-violet)]",
    ring: "border-[var(--orchid-violet)]/60",
  },
] as const;

export function ServicesSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-24 border-t border-[var(--orchid-border)]">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-28">
        <h2 id="services-title" className="orchid-display max-w-[18ch] text-[clamp(2.25rem,6vw,3.75rem)]">
          Two ways to bring it to life.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {SERVICES.map((service) => (
            <article
              key={service.id}
              className={`relative rounded-[28px] border-2 ${service.ring} bg-[var(--orchid-surface)] p-7 sm:p-9`}
            >
              <span aria-hidden="true" className={`orchid-corner orchid-corner--tl ${service.tone}`} />
              <span aria-hidden="true" className={`orchid-corner orchid-corner--br ${service.tone}`} />
              <h3 className={`orchid-display text-[2rem] sm:text-[2.5rem] ${service.tone}`}>{service.title}</h3>
              <p className="mt-4 max-w-[40ch] text-lg leading-relaxed">{service.description}</p>
              <p className="mt-3 text-[var(--orchid-muted)]">{service.examples}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <StartProjectButton isAuthenticated={isAuthenticated} className="orchid-btn orchid-btn-primary">
            Start a project
          </StartProjectButton>
          <a
            href="/services"
            className="inline-flex min-h-[44px] items-center font-semibold text-[var(--orchid-text)] underline underline-offset-4 hover:text-[var(--orchid-pink)]"
          >
            See all services
          </a>
        </div>
      </div>
    </section>
  );
}
