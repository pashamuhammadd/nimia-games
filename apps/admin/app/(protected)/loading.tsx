// Route-level Suspense fallback, same skeleton pattern as
// apps/studio/app/dashboard/loading.tsx — covers the "loading state" every
// page needs per the project's frontend standards, without client-side state.
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className ?? ""}`} />;
}

export default function ProtectedLoading() {
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
