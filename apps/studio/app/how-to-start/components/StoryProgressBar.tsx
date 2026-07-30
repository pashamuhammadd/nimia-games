"use client";

// Instagram-Story-style progress strip, sits above the roadmap. One
// segment per step: fully filled for steps already passed, the active
// segment fills left-to-right in step with useStoryAutoplay's `progress`
// value (updates ~25x/sec, smoothed with a short CSS transition so it
// doesn't look stepped), upcoming segments stay empty.
export function StoryProgressBar({
  count,
  activeIndex,
  progress,
}: {
  count: number;
  activeIndex: number;
  progress: number;
}) {
  return (
    <div
      className="mx-auto flex max-w-3xl gap-1.5"
      role="progressbar"
      aria-label="Journey progress"
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={count}
    >
      {Array.from({ length: count }).map((_, i) => {
        const fillRatio = i < activeIndex ? 1 : i === activeIndex ? progress : 0;
        return (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
              style={{ width: `${fillRatio * 100}%`, transition: "width 60ms linear" }}
            />
          </div>
        );
      })}
    </div>
  );
}
