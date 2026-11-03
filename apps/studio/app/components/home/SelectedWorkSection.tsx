import { FULL_PORTFOLIO_URL } from "../../portfolio/data";
import type { SelectedWorkResult } from "./selected-work";

export function SelectedWorkSection({ result }: { result: SelectedWorkResult }) {
  return (
    <section id="work" aria-labelledby="work-title" className="scroll-mt-24 border-t border-[var(--orchid-border)]">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="work-title" className="orchid-display text-[clamp(2.25rem,6vw,3.75rem)]">
              Selected work
            </h2>
            <p className="mt-3 text-lg text-[var(--orchid-muted)]">A little of what we do.</p>
          </div>
          <a
            href={FULL_PORTFOLIO_URL}
            className="inline-flex min-h-[44px] items-center self-start rounded-full font-semibold text-[var(--orchid-pink)] underline-offset-4 hover:underline sm:self-auto"
          >
            View the full portfolio
          </a>
        </div>

        {result.status === "ok" ? (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item, index) => (
              <li key={item.id}>
                <a href={item.href} className="group block rounded-[28px] text-[var(--orchid-text)]">
                  <div className="aspect-[4/3] overflow-hidden rounded-[28px] bg-[var(--orchid-surface)] ring-1 ring-[var(--orchid-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already serves optimized derivatives */}
                    <img
                      src={item.imageSrc}
                      srcSet={item.imageSrcSet}
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      alt=""
                      width={item.width ?? undefined}
                      height={item.height ?? undefined}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-4 text-lg font-bold leading-snug">{item.title}</p>
                  {item.category ? <p className="mt-1 text-sm text-[var(--orchid-muted)]">{item.category}</p> : null}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10 rounded-[28px] border border-dashed border-[var(--orchid-border)] px-6 py-12 text-center">
            <p className="text-lg font-semibold">
              {result.status === "empty"
                ? "New work is being curated right now."
                : "Our latest work couldn’t be loaded here."}
            </p>
            <p className="mx-auto mt-2 max-w-[48ch] text-[var(--orchid-muted)]">
              Browse every published project on the full portfolio.
            </p>
            <a href={FULL_PORTFOLIO_URL} className="orchid-btn orchid-btn-ghost mt-6">
              Open the portfolio
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
