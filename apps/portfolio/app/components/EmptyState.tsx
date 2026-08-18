import { Film } from "lucide-react";

// Spec §30: "No animations found. Try another category or search term."
export function EmptyState() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--nimia-border)] text-[var(--nimia-muted)]">
        <Film className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-5 text-lg font-semibold text-white">No animations found.</p>
      <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">Try another category or search term.</p>
    </div>
  );
}
