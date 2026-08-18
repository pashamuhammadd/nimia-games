"use client";

import { PortfolioCard, gridSpanClasses } from "./PortfolioCard";
import { PortfolioSkeleton } from "./PortfolioSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadMoreButton } from "./LoadMoreButton";
import type { PortfolioItem } from "../../lib/portfolio-types";

interface PortfolioGridProps {
  items: PortfolioItem[];
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;
  onOpen: (slug: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

// Responsive editorial grid (spec §8/§22): 2 columns on mobile, 3 on
// tablet, 4 on desktop, with row/column spans per item (see
// PortfolioCard's gridSpanClasses) so 1:1/16:9/9:16 items coexist without
// forcing a uniform tile. `grid-auto-flow: dense` backfills gaps left by
// spanning items instead of leaving holes.
export function PortfolioGrid({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  onOpen,
  onLoadMore,
  onRetry,
}: PortfolioGridProps) {
  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (loading) {
    return <PortfolioSkeleton />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid auto-rows-[190px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[220px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, index) => (
          <PortfolioCard key={item.id} item={item} onOpen={onOpen} priority={index < 4} />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <LoadMoreButton loading={loadingMore} onClick={onLoadMore} />
        </div>
      ) : null}
    </div>
  );
}

// Re-exported so callers that only need sizing logic (none currently
// outside this module) don't need to import PortfolioCard directly.
export { gridSpanClasses };
