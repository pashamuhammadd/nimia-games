"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@nimia/ui";
import type { PortfolioCategory, PortfolioFormat, PortfolioSort } from "../../lib/portfolio-types";

const FORMAT_CHIPS: { value: PortfolioFormat; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const SORT_OPTIONS: { value: PortfolioSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "featured", label: "Featured" },
  { value: "az", label: "A–Z" },
];

interface PortfolioNavProps {
  categories: PortfolioCategory[];
  activeCategory: string | null;
  activeFormat: PortfolioFormat | null;
  sort: PortfolioSort;
  onSelectCategory: (slug: string | null) => void;
  onSelectFormat: (format: PortfolioFormat | null) => void;
  onChangeSort: (sort: PortfolioSort) => void;
}

// Editorial navigation strip, not a filter form (spec §6: "This must NOT
// look like a traditional filter form... it should feel like editorial
// navigation"). One active item at a time via a pink underline, mirroring
// the category-tab pattern rather than checkboxes/dropdowns. Sort sits to
// the right as a single subtle dropdown (§7).
export function PortfolioNav({
  categories,
  activeCategory,
  activeFormat,
  sort,
  onSelectCategory,
  onSelectFormat,
  onChangeSort,
}: PortfolioNavProps) {
  const isAllActive = !activeCategory && !activeFormat;

  return (
    <div
      id="explore-portfolio"
      className="sticky top-16 z-30 border-y border-[var(--nimia-border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <nav className="nimia-no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          <NavChip label="All Works" active={isAllActive} onClick={() => onSelectCategory(null)} />
          {categories.map((category) => (
            <NavChip
              key={category.id}
              label={category.name}
              active={activeCategory === category.slug}
              onClick={() => onSelectCategory(category.slug)}
            />
          ))}
          <span className="mx-1 h-4 w-px shrink-0 bg-[var(--nimia-border)]" aria-hidden="true" />
          {FORMAT_CHIPS.map((chip) => (
            <NavChip
              key={chip.value}
              label={chip.label}
              active={activeFormat === chip.value}
              onClick={() => onSelectFormat(chip.value)}
            />
          ))}
        </nav>

        <div className="relative shrink-0">
          <select
            aria-label="Sort portfolio"
            value={sort}
            onChange={(event) => onChangeSort(event.target.value as PortfolioSort)}
            className="appearance-none rounded-md border border-[var(--nimia-border)] bg-transparent py-1.5 pl-3 pr-8 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimia-pink)]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[var(--nimia-popover)] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--nimia-muted)]"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function NavChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 whitespace-nowrap border-b-2 px-2.5 py-1.5 text-[13px] font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-[var(--nimia-pink)] text-white"
          : "border-transparent text-[var(--nimia-muted)] hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
