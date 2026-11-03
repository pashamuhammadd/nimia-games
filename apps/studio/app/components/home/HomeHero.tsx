import { StartProjectButton } from "../StartProjectButton";
import type { SelectedWorkItem } from "./selected-work";

// Hero: approved preview copy + the Motion Frame composition. The frame's
// window shows a still from a REAL published portfolio piece when one is
// available; otherwise it stays an abstract pink/violet field. The
// character from the preview image is not used (not an approved mascot).
export function HomeHero({
  isAuthenticated,
  featured,
}: {
  isAuthenticated: boolean;
  featured: SelectedWorkItem | null;
}) {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[-20%] h-[36rem] w-[36rem] rounded-full bg-[var(--orchid-violet)]/15 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.25fr_1fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div>
          <p className="mb-6 text-sm font-semibold text-[var(--orchid-violet-soft)]">Independent creative studio</p>
          <h1 id="hero-title" className="orchid-display text-[clamp(2.75rem,11vw,5.5rem)]">
            <span className="block">Big ideas.</span>
            <span className="orchid-gradient-text block pb-[0.08em]">Wildly alive.</span>
          </h1>
          <p className="mt-6 max-w-[32ch] text-lg leading-relaxed text-[var(--orchid-text)] sm:text-xl">
            Animation and development for brands ready to stand out.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <a href="#work" className="orchid-btn orchid-btn-primary">
              Explore our work
            </a>
            <StartProjectButton isAuthenticated={isAuthenticated} className="orchid-btn orchid-btn-ghost">
              Start a project
            </StartProjectButton>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[460px] lg:max-w-[520px]">
          <div className="motion-frame">
            <svg className="motion-frame__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
              <path
                className="motion-frame__pink"
                d="M9 66 V26 A17 17 0 0 1 26 9 H72"
                fill="none"
                stroke="var(--orchid-pink)"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path
                className="motion-frame__violet"
                d="M91 34 V74 A17 17 0 0 1 74 91 H28"
                fill="none"
                stroke="var(--orchid-violet)"
                strokeWidth="13"
                strokeLinecap="round"
              />
            </svg>
            <div className="motion-frame__window">
              {featured ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already serves optimized derivatives (see lib/cloudinary-url.ts)
                <img
                  src={featured.imageSrc}
                  srcSet={featured.imageSrcSet}
                  sizes="(min-width: 1024px) 360px, 70vw"
                  alt={`Still from “${featured.title}”, a Nimia Studio project`}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              ) : null}
            </div>
          </div>
          <p
            aria-hidden="true"
            className="absolute -bottom-2 right-0 rotate-[-8deg] rounded-xl bg-[var(--orchid-text)] px-4 py-2 text-base font-extrabold leading-tight text-[var(--orchid-bg)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:right-[-4%]"
          >
            Built to move you
          </p>
        </div>
      </div>
    </section>
  );
}
