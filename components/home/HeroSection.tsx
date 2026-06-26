const stats = [
  { value: "3+", label: "Games in Development" },
  { value: "120+", label: "Animations Produced" },
  { value: "500+", label: "Digital Assets" },
  { value: "7+", label: "Years Building" },
];

export default function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden px-5 pt-32 md:px-6 md:pt-40">
      <div className="absolute left-1/2 top-12 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#6A42E8]/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-white/65">
            Game • Animation • Digital Worlds
          </p>

          <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
            Building Games, Animation &{" "}
            <span className="nimia-gradient-text">Digital Worlds.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-white/60 md:text-lg">
            Nimia Games is an independent studio creating original games,
            high-quality animation, and digital experiences for players,
            communities, and innovative brands.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <a
  href="#gallery"
  className="nimia-button-primary rounded-full px-6 py-3 text-sm font-black"
>
  View Animation Gallery
</a>

            <a
              href="#games"
              className="nimia-button-secondary rounded-full px-6 py-3 text-sm font-black"
            >
              Explore Games
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-2">
          {stats.map((item) => (
            <div key={item.label} className="nimia-card rounded-3xl p-6">
              <p className="nimia-gradient-text text-4xl font-black md:text-5xl">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}