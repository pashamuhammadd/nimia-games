export default function CTASection() {
  return (
    <section id="contact" className="px-5 pb-24 md:px-6">
      <div className="nimia-card mx-auto max-w-7xl overflow-hidden rounded-3xl p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-white/45">
              Ready to create something amazing?
            </p>

            <h2 className="max-w-2xl text-3xl font-black leading-tight text-white md:text-5xl">
              Let’s build your next{" "}
              <span className="nimia-gradient-text">great project</span>{" "}
              together.
            </h2>

            <p className="mt-5 max-w-2xl text-white/60">
              Visit Nimia Studio for animation production, digital assets, game
              assets, and custom interactive experiences.
            </p>
          </div>

          <a
            href="https://studio.nimiagames.com"
            target="_blank"
            rel="noreferrer"
            className="nimia-button-primary inline-flex w-fit rounded-full px-6 py-3 text-sm font-black"
          >
            Go to Studio ↗
          </a>
        </div>
      </div>
    </section>
  );
}