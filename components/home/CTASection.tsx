interface CTASectionProps {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: string;
  compact?: boolean;
}

export default function CTASection({
  eyebrow = "Ready to create something amazing?",
  title = (
    <>
      Let&rsquo;s build your next{" "}
      <span className="nimia-accent-text">great project</span> together.
    </>
  ),
  description = "Visit Nimia Studio for animation production, digital assets, game assets, and custom interactive experiences.",
  compact = false,
}: CTASectionProps) {
  return (
    <section
      id="contact"
      className={compact ? "px-5 md:px-6" : "px-5 pb-16 md:px-6"}
    >
      <div className="nimia-card mx-auto max-w-6xl overflow-hidden rounded-3xl p-6 md:p-9">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              {eyebrow}
            </p>

            <h2 className="max-w-2xl text-xl font-black leading-tight text-white md:text-3xl">
              {title}
            </h2>

            <p className="mt-3 max-w-2xl text-sm text-white/60">
              {description}
            </p>
          </div>

          <a
            href="https://studio.nimiagames.com"
            target="_blank"
            rel="noreferrer"
            className="nimia-button-primary inline-flex w-fit rounded-full px-5 py-2.5 text-xs font-black"
          >
            Go to Studio ↗
          </a>
        </div>
      </div>
    </section>
  );
}
