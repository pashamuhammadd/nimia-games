import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center md:px-6">
      <p className="nimia-accent-text font-display text-5xl font-bold md:text-6xl">
        404
      </p>

      <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
        This page couldn&rsquo;t be found.
      </h1>

      <p className="mt-3 max-w-md text-sm text-white/55">
        Looks like the world you&rsquo;re looking for hasn&rsquo;t been built
        yet, or the link has changed. Let&rsquo;s head back to the Nimia
        Games homepage.
      </p>

      <Link
        href="/"
        className="nimia-button-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-xs font-black"
      >
        Back to Home
      </Link>
    </section>
  );
}
