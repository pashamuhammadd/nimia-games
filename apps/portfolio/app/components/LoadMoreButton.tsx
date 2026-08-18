import { ChevronDown, Loader2 } from "lucide-react";

// Spec §19: minimal "LOAD MORE WORKS ↓" instead of numbered pagination.
export function LoadMoreButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--nimia-border)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/85 transition-colors hover:border-[var(--nimia-pink)]/50 hover:text-white disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Load More Works
    </button>
  );
}
