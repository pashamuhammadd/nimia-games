import { PortfolioSkeleton } from "./components/PortfolioSkeleton";

export default function Loading() {
  return (
    <main>
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6">
        <div className="nimia-skeleton h-4 w-32 rounded-full" />
        <div className="nimia-skeleton mt-4 h-12 w-2/3 rounded-full" />
      </div>
      <PortfolioSkeleton />
    </main>
  );
}
