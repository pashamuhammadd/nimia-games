// Route-level Suspense fallback for /dashboard (30 Juli 2026, Client
// Dashboard redesign) — Next.js renders this automatically while
// page.tsx's async Server Component data fetch (profile/client/projects/
// invoices/activity queries) is in flight. Covers the brief's "Loading
// Skeleton" animation requirement without needing client-side state.
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBlock className="h-44 w-full rounded-3xl sm:h-48" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-80 lg:col-span-2" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
}
