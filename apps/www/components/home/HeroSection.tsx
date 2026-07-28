import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";

const stats = [
  { value: "3+", label: "Games in Development" },
  { value: "120+", label: "Animations Produced" },
  { value: "500+", label: "Digital Assets" },
  { value: "7+", label: "Years Building" },
];

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[62vh] items-center overflow-hidden px-5 md:px-6">
      <div className="absolute left-1/2 top-12 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/10 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <Reveal>
          <p className="font-display inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">
            Game • Animation • Solana Worlds
          </p>

          <h1 className="mt-6 max-w-2xl text-3xl font-black leading-[1.05] tracking-tight text-white md:text-5xl">
            Building Games, Animation &{" "}
            <span className="nimia-accent-text">Digital Worlds.</span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-7 text-white/60 md:text-base">
            Nimia Games is an independent studio creating original games,
            high-quality animation, and digital experiences for players,
            communities, and the Solana ecosystem.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <FlowLink
              href="/gallery"
              className="nimia-button-primary rounded-full px-5 py-2.5 text-xs font-black"
            >
              View Animation Gallery
            </FlowLink>

            <FlowLink
              href="/games"
              className="nimia-button-secondary rounded-full px-5 py-2.5 text-xs font-black"
            >
              Explore Games
            </FlowLink>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
          {stats.map((item, index) => (
            <Reveal key={item.label} delay={index * 80}>
              <div className="nimia-card rounded-2xl p-4">
                <p className="font-display nimia-accent-text text-2xl font-bold md:text-3xl">
                  {item.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  {item.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
