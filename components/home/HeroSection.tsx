export default function HeroSection() {
  return (
    <section className="flex min-h-screen items-center px-6 pt-24">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
          Independent Game Studio
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Building playful worlds for the next generation of games.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Nimia Games is an independent game studio focused on creating immersive digital worlds, cozy multiplayer experiences, and future-ready game ecosystems.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#games"
            className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-black hover:bg-emerald-300"
          >
            Explore Games
          </a>

          <a
            href="https://studio.nimiagames.com"
            target="_blank"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Build With Us
          </a>
        </div>
      </div>
    </section>
  );
}