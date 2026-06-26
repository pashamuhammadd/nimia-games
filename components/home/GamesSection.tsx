import Image from "next/image";

export default function GamesSection() {
  return (
    <section id="games" className="px-5 pb-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-white/45">
              Featured Games
            </p>

            <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
              Original worlds. <br />
              <span className="nimia-gradient-text">Built with passion.</span>
            </h2>
          </div>
        </div>

        <div className="nimia-card overflow-hidden rounded-3xl">
          <div className="grid md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex items-center justify-center p-8 md:p-10">
              <div className="group relative aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                <Image
                  src="/games/lifetopia-preview.png"
                  alt="Lifetopia World Logo"
                  fill
                  priority
                  className="object-contain p-10 transition duration-700 group-hover:scale-105 md:p-12"
                />

                <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5" />

                <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur">
                  Alpha Project
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">
                In Development
              </p>

              <h3 className="mt-4 text-3xl font-black text-white md:text-4xl">
                Lifetopia World
              </h3>

              <p className="mt-2 text-lg font-bold text-white/70">
                Cozy Life Simulation
              </p>

              <p className="mt-5 max-w-2xl text-base leading-8 text-white/60">
                A peaceful life simulation game where players can farm, fish,
                cook, craft, build, trade, and connect with others in a charming
                digital world.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Web", "Mobile", "Solana"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-xs text-white/55"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <a
                href="https://lifetopiaworld.io"
                target="_blank"
                rel="noreferrer"
                className="nimia-button-secondary mt-8 inline-flex rounded-full px-5 py-3 text-sm font-bold"
              >
                Visit Lifetopia →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}