export default function CTASection() {
  return (
    <section id="contact" className="px-6 py-24">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <h2 className="text-3xl font-bold md:text-5xl">
          Want to build a game with Nimia?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-white/60">
          For investors, partners, and clients who want to build game products with us.
        </p>

        <a
          href="https://studio.nimiagames.com"
          target="_blank"
          className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-white/80"
        >
          Go to Nimia Studio
        </a>
      </div>
    </section>
  );
}