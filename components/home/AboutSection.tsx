import Image from "next/image";

export default function AboutSection() {
  return (
    <section id="about" className="px-5 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          About Nimia
        </p>

        <div className="grid gap-16 lg:grid-cols-[420px_1fr] lg:items-center">
          <div className="nimia-card rounded-[32px] p-8">
            <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
              <Image
                src="/founder/pasha.png"
                alt="Pasha Muhammad"
                fill
                priority
                className="object-cover"
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-3xl font-black text-white">Pasha Muhammad</p>

              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/45">
                Founder
              </p>

              <p className="mt-5 text-sm leading-7 text-white/60">
                Founder of Nimia Games, focused on building original games,
                animation production, digital assets, and interactive
                entertainment experiences.
              </p>

              <a
                href="https://pashamuhammad.me"
                target="_blank"
                rel="noreferrer"
                className="nimia-button-primary mt-8 inline-flex rounded-full px-6 py-3 text-sm font-black"
              >
                Visit Founder Profile ↗
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-black leading-tight text-white md:text-6xl">
              More than a{" "}
              <span className="nimia-gradient-text">game studio.</span>
            </h2>

            <p className="mt-8 max-w-3xl text-lg leading-9 text-white/60">
              Nimia Games is an independent creative studio dedicated to
              building original games, high-quality animation, and digital
              experiences that inspire players, communities, and innovative
              brands.
            </p>

            <p className="mt-6 max-w-3xl text-lg leading-9 text-white/60">
              We combine creativity, technology, and production experience to
              create memorable digital worlds with long-term vision and strong
              execution.
            </p>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              <div className="nimia-card rounded-3xl p-6">
                <h3 className="text-xl font-black text-white">
                  Game Development
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  Original IP, multiplayer experiences, cozy simulation games,
                  and interactive digital worlds.
                </p>
              </div>

              <div className="nimia-card rounded-3xl p-6">
                <h3 className="text-xl font-black text-white">
                  Animation & Digital Assets
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  Character animation, trailers, motion graphics, game assets,
                  UI animation, and creative production for modern brands.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}