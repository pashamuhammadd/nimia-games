"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Hero } from "./Hero";
import { PortfolioNav } from "./PortfolioNav";
import { PortfolioGrid } from "./PortfolioGrid";
import { PortfolioModal } from "./PortfolioModal";
import type {
  PortfolioCategory,
  PortfolioFormat,
  PortfolioItem,
  PortfolioListResult,
  PortfolioSort,
} from "../../lib/portfolio-types";

interface PortfolioExperienceProps {
  initialItems: PortfolioItem[];
  initialTotal: number;
  initialHasMore: boolean;
  categories: PortfolioCategory[];
  featured: PortfolioItem | null;
  initialCategory: string | null;
  initialFormat: PortfolioFormat | null;
  initialSort: PortfolioSort;
  initialWorkSlug: string | null;
  initialWorkItem: PortfolioItem | null;
}

const PAGE_SIZE = 24;

// Owns all client-side interaction for the gallery: category/format/sort
// changes (re-fetch page 1), Load More (append next page), and the modal
// (open/close/prev/next + a shareable ?work=slug deep link, spec §29).
// Deliberately reads its OWN local state as the source of truth and only
// mirrors it into the URL one-way via router.replace — avoids needing
// useSearchParams (and the Suspense boundary that hook requires) entirely.
export function PortfolioExperience({
  initialItems,
  initialTotal,
  initialHasMore,
  categories,
  featured,
  initialCategory,
  initialFormat,
  initialSort,
  initialWorkSlug,
  initialWorkItem,
}: PortfolioExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [category, setCategory] = React.useState(initialCategory);
  const [format, setFormat] = React.useState(initialFormat);
  const [sort, setSort] = React.useState(initialSort);
  const [items, setItems] = React.useState(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState(false);

  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(initialWorkSlug);
  const [directItem, setDirectItem] = React.useState<PortfolioItem | null>(initialWorkItem);

  const requestId = React.useRef(0);

  const syncUrl = React.useCallback(
    (next: { category?: string | null; format?: PortfolioFormat | null; sort?: PortfolioSort; work?: string | null }) => {
      const params = new URLSearchParams();
      const nextCategory = next.category !== undefined ? next.category : category;
      const nextFormat = next.format !== undefined ? next.format : format;
      const nextSort = next.sort !== undefined ? next.sort : sort;
      const nextWork = next.work !== undefined ? next.work : selectedSlug;

      if (nextCategory) params.set("category", nextCategory);
      if (nextFormat) params.set("format", nextFormat);
      if (nextSort && nextSort !== "latest") params.set("sort", nextSort);
      if (nextWork) params.set("work", nextWork);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [category, format, sort, selectedSlug, pathname, router],
  );

  const fetchPage = React.useCallback(
    async (targetPage: number, filters: { category: string | null; format: PortfolioFormat | null; sort: PortfolioSort }) => {
      const currentRequest = ++requestId.current;
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (filters.category) params.set("category", filters.category);
      if (filters.format) params.set("format", filters.format);
      if (filters.sort) params.set("sort", filters.sort);

      const response = await fetch(`/api/portfolio?${params.toString()}`);
      if (currentRequest !== requestId.current) return null; // superseded by a newer request
      if (!response.ok) throw new Error("Failed to load portfolio");
      return (await response.json()) as PortfolioListResult;
    },
    [],
  );

  const applyFilters = React.useCallback(
    (next: { category?: string | null; format?: PortfolioFormat | null; sort?: PortfolioSort }) => {
      const nextCategory = next.category !== undefined ? next.category : category;
      const nextFormat = next.format !== undefined ? next.format : format;
      const nextSort = next.sort !== undefined ? next.sort : sort;

      setCategory(nextCategory);
      setFormat(nextFormat);
      setSort(nextSort);
      syncUrl(next);
      setLoading(true);
      setError(false);

      fetchPage(1, { category: nextCategory, format: nextFormat, sort: nextSort })
        .then((result) => {
          if (!result) return;
          setItems(result.items);
          setTotal(result.total);
          setHasMore(result.hasMore);
          setPage(1);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    },
    [category, format, sort, syncUrl, fetchPage],
  );

  const handleLoadMore = React.useCallback(() => {
    setLoadingMore(true);
    setError(false);
    fetchPage(page + 1, { category, format, sort })
      .then((result) => {
        if (!result) return;
        setItems((prev) => [...prev, ...result.items]);
        setHasMore(result.hasMore);
        setPage((p) => p + 1);
      })
      .catch(() => setError(true))
      .finally(() => setLoadingMore(false));
  }, [page, category, format, sort, fetchPage]);

  const openItem = React.useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      setDirectItem(null);
      syncUrl({ work: slug });
    },
    [syncUrl],
  );

  const closeModal = React.useCallback(() => {
    setSelectedSlug(null);
    setDirectItem(null);
    syncUrl({ work: null });
  }, [syncUrl]);

  const loadedIndex = items.findIndex((item) => item.slug === selectedSlug);
  const activeItem = loadedIndex >= 0 ? items[loadedIndex] : directItem;

  const navigate = React.useCallback(
    (direction: "prev" | "next") => {
      if (loadedIndex < 0) return; // deep-linked item not in the loaded list — no sibling nav
      const nextIndex = direction === "prev" ? loadedIndex - 1 : loadedIndex + 1;
      const nextItem = items[nextIndex];
      if (!nextItem) return;
      setSelectedSlug(nextItem.slug);
      syncUrl({ work: nextItem.slug });
    },
    [items, loadedIndex, syncUrl],
  );

  return (
    <main>
      <Hero featured={featured} onOpen={openItem} />

      <PortfolioNav
        categories={categories}
        activeCategory={category}
        activeFormat={format}
        sort={sort}
        onSelectCategory={(slug) => applyFilters({ category: slug, format: null })}
        onSelectFormat={(value) => applyFilters({ format: value, category: null })}
        onChangeSort={(value) => applyFilters({ sort: value })}
      />

      <p className="mx-auto max-w-6xl px-4 pt-6 text-xs text-[var(--nimia-muted)] sm:px-6" aria-live="polite">
        {loading ? "Loading…" : `${total} work${total === 1 ? "" : "s"}`}
      </p>

      <PortfolioGrid
        items={items}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        onOpen={openItem}
        onLoadMore={handleLoadMore}
        onRetry={() => applyFilters({})}
      />

      <PortfolioModal
        item={activeItem}
        onClose={closeModal}
        onNavigate={navigate}
        hasPrev={loadedIndex > 0}
        hasNext={loadedIndex >= 0 && loadedIndex < items.length - 1}
      />
    </main>
  );
}
