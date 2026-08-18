// Skeleton shaped like the real gallery grid (spec §30: "Use skeletons
// that match the actual gallery shape"), reusing the same span pattern
// PortfolioCard/PortfolioGrid use so the loading state doesn't visually
// "pop" once real content replaces it.
const SKELETON_SPANS = [
  "",
  "sm:col-span-2",
  "row-span-2",
  "",
  "sm:col-span-2",
  "",
  "row-span-2",
  "",
  "sm:col-span-2",
  "",
  "",
  "row-span-2",
];

export function PortfolioSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid auto-rows-[190px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[220px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {SKELETON_SPANS.map((span, index) => (
          <div
            key={index}
            className={`nimia-skeleton rounded-2xl border border-[var(--nimia-border)] ${span}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
