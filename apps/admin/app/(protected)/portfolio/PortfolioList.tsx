"use client";

import * as React from "react";
import { Search, Star, Pencil, Trash2, RefreshCw, Check, X } from "lucide-react";
import { cn } from "@nimia/ui";
import {
  setPortfolioStatusAction,
  setPortfolioFeaturedAction,
  updatePortfolioSortOrderAction,
  updatePortfolioMetadataAction,
  deletePortfolioItemAction,
  syncFromCloudinaryAction,
} from "./actions";

export interface PortfolioAdminRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  client: string | null;
  project: string | null;
  resourceType: "image" | "video";
  format: "1:1" | "16:9" | "9:16" | "gif" | null;
  thumbnailUrl: string;
  featured: boolean;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  source: "manual" | "cloudinary_sync";
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: string[];
}

interface PortfolioCategoryOption {
  id: string;
  name: string;
  slug: string;
}

// Fix for a reported bug (19 Agustus 2026): this app's globals.css already
// sets `color-scheme: dark` at :root specifically so native <select> popups
// pick up dark browser chrome instead of the OS default light one (see that
// file's own comment) — but that alone isn't reliable for every
// browser/OS combination, and these two <select>s ended up with an open
// option list rendering white text on a white/system background,
// effectively invisible. Styling <option> directly (background-color +
// color are the one native-<select> sub-element browsers do actually let
// you set) is the robust, cross-browser fix — using the same brand tokens
// (--nimia-popover for the dark maroon panel background, --foreground for
// legible text) every other floating panel in this app already uses (see
// packages/ui/src/components/Listbox.tsx).
const OPTION_LIST_STYLE: React.CSSProperties = { colorScheme: "dark" };
const OPTION_STYLE: React.CSSProperties = {
  backgroundColor: "var(--nimia-popover)",
  color: "var(--foreground)",
};

const STATUS_LABELS: Record<PortfolioAdminRow["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_TONES: Record<PortfolioAdminRow["status"], string> = {
  draft: "text-amber-300",
  published: "text-emerald-300",
  archived: "text-white/40",
};

export function PortfolioList({
  items,
  categories,
}: {
  items: PortfolioAdminRow[];
  categories: PortfolioCategoryOption[];
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | PortfolioAdminRow["status"]>("all");
  const [isSyncing, startSyncTransition] = React.useTransition();
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.client?.toLowerCase().includes(q) ||
        item.project?.toLowerCase().includes(q) ||
        item.category?.name.toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  function handleSync() {
    setSyncMessage(null);
    setSyncError(null);
    startSyncTransition(async () => {
      const result = await syncFromCloudinaryAction();
      if (!result.success) {
        setSyncError(result.error);
        return;
      }
      setSyncMessage(
        `Scanned ${result.scanned} Cloudinary asset${result.scanned === 1 ? "" : "s"} — ${result.created} added, ${result.updated} updated.`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, client, project, category..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white focus:outline-none"
            style={OPTION_LIST_STYLE}
          >
            <option value="all" style={OPTION_STYLE}>
              All statuses
            </option>
            <option value="published" style={OPTION_STYLE}>
              Published
            </option>
            <option value="draft" style={OPTION_STYLE}>
              Draft
            </option>
            <option value="archived" style={OPTION_STYLE}>
              Archived
            </option>
          </select>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSync}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} aria-hidden="true" />
            {isSyncing ? "Syncing..." : "Sync from Cloudinary"}
          </button>
        </div>
      </div>

      {syncMessage ? <p className="text-xs text-emerald-300">{syncMessage}</p> : null}
      {syncError ? <p className="text-xs text-red-400">{syncError}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
          No portfolio items yet. Upload assets to the configured Cloudinary folder and click &ldquo;Sync from
          Cloudinary&rdquo;, or wait for the webhook to pick up new uploads automatically.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <PortfolioRowItem key={item.id} item={item} categories={categories} />
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
              No items match your search/filter.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PortfolioRowItem({
  item,
  categories,
}: {
  item: PortfolioAdminRow;
  categories: PortfolioCategoryOption[];
}) {
  const [isPending, startTransition] = React.useTransition();
  const [isEditing, setIsEditing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortOrderInput, setSortOrderInput] = React.useState(String(item.sortOrder));

  const [form, setForm] = React.useState({
    title: item.title,
    description: item.description ?? "",
    client: item.client ?? "",
    project: item.project ?? "",
    categoryId: item.category?.id ?? "",
    tags: item.tags.join(", "),
  });

  function toggleFeatured() {
    setError(null);
    startTransition(async () => {
      const result = await setPortfolioFeaturedAction(item.id, !item.featured);
      if (!result.success) setError(result.error);
    });
  }

  function changeStatus(status: PortfolioAdminRow["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await setPortfolioStatusAction(item.id, status);
      if (!result.success) setError(result.error);
    });
  }

  function saveSortOrder() {
    const value = Number(sortOrderInput);
    setError(null);
    startTransition(async () => {
      const result = await updatePortfolioSortOrderAction(item.id, value);
      if (!result.success) setError(result.error);
    });
  }

  function saveMetadata() {
    setError(null);
    startTransition(async () => {
      const result = await updatePortfolioMetadataAction(item.id, {
        title: form.title,
        description: form.description || null,
        client: form.client || null,
        project: form.project || null,
        categoryId: form.categoryId || null,
        tagNames: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.title}" from the portfolio? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePortfolioItemAction(item.id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-lg bg-white/[0.06]" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{item.title}</p>
              <span className={cn("text-xs font-medium", STATUS_TONES[item.status])}>
                {STATUS_LABELS[item.status]}
              </span>
              {item.source === "cloudinary_sync" ? (
                <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
                  synced
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {[item.category?.name, item.format ?? item.resourceType, item.client, item.project]
                .filter(Boolean)
                .join(" · ") || "No metadata yet"}
            </p>
            {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start sm:self-center">
          <button
            type="button"
            disabled={isPending}
            onClick={toggleFeatured}
            aria-pressed={item.featured}
            title={item.featured ? "Unfeature" : "Feature"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
              item.featured
                ? "border-[var(--nimia-pink)]/40 bg-[var(--nimia-pink)]/10 text-[var(--nimia-pink)]"
                : "border-white/10 text-white/50 hover:bg-white/[0.06]",
            )}
          >
            <Star className="h-3.5 w-3.5" fill={item.featured ? "currentColor" : "none"} aria-hidden="true" />
          </button>

          <input
            type="number"
            value={sortOrderInput}
            onChange={(event) => setSortOrderInput(event.target.value)}
            onBlur={saveSortOrder}
            title="Sort order (higher = earlier)"
            className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white focus:outline-none"
          />

          {item.status !== "published" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus("published")}
              className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
            >
              Publish
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus("draft")}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
            >
              Unpublish
            </button>
          )}
          {item.status !== "archived" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus("archived")}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.06]"
            >
              Archive
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/[0.06]"
            title="Edit metadata"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
              style={OPTION_LIST_STYLE}
            >
              <option value="" style={OPTION_STYLE}>
                No category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id} style={OPTION_STYLE}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <input
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
            />
          </Field>
          <Field label="Project">
            <input
              value={form.project}
              onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
            />
          </Field>
          <Field label="Tags (comma-separated)" full>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
            />
          </Field>
          <Field label="Description" full>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white focus:outline-none"
            />
          </Field>

          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={isPending}
              onClick={saveMetadata}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1", full && "sm:col-span-2")}>
      <span className="text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  );
}
