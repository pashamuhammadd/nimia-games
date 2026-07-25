export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 pt-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--nimia-pink)]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
          Loading
        </p>
      </div>
    </div>
  );
}
