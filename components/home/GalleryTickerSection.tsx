const galleryItems = [
  "/gallery/animation-1.mp4",
  "/gallery/animation-2.mp4",
  "/gallery/animation-3.mp4",
  "/gallery/animation-4.mp4",
  "/gallery/animation-5.mp4",
  "/gallery/animation-6.mp4",
];

export default function GalleryTickerSection() {
  const repeatedItems = [...galleryItems, ...galleryItems];

  return (
    <section id="gallery" className="overflow-hidden border-y border-white/10 py-20">
      <div className="mx-auto mb-10 max-w-7xl px-5 md:px-6">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-white/45">
          Animation Gallery
        </p>

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="text-4xl font-black text-white md:text-5xl">
              Bringing ideas{" "}
              <span className="nimia-gradient-text">to life.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-white/60">
              A running showcase of animation, motion graphics, game assets,
              and digital visuals created by Nimia.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", "Character", "Web3", "Motion", "Game Trailer"].map(
              (item, index) => (
                <span
                  key={item}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    index === 0
                      ? "nimia-gradient-bg text-white"
                      : "border border-white/10 text-white/50"
                  }`}
                >
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="relative flex w-full overflow-hidden">
        <div className="flex animate-gallery-ticker gap-5">
          {repeatedItems.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="group relative aspect-square w-52 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] transition-all duration-300 hover:-translate-y-1 hover:border-[#6A42E8]/50 hover:shadow-[0_18px_40px_rgba(91,61,245,0.18)] md:w-64"
            >
              <video
                src={item}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden border-y border-white/10 bg-white/[0.025] py-3">
        <div className="flex animate-gallery-ticker whitespace-nowrap text-xs font-bold uppercase tracking-widest text-white/35">
          <span className="mr-10">
            NIMIA GAMES STUDIO • ANIMATION PRODUCTION • GAME ASSETS • DIGITAL WORLDS •
          </span>
          <span className="mr-10">
            NIMIA GAMES STUDIO • ANIMATION PRODUCTION • GAME ASSETS • DIGITAL WORLDS •
          </span>
          <span className="mr-10">
            NIMIA GAMES STUDIO • ANIMATION PRODUCTION • GAME ASSETS • DIGITAL WORLDS •
          </span>
        </div>
      </div>
    </section>
  );
}