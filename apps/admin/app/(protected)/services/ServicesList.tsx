"use client";

import * as React from "react";
import { Search, Power, Pencil, Check, X } from "lucide-react";
import { cn } from "@nimia/ui";
import { setServiceActiveAction, updateServicePriceAction } from "./actions";

// Real implementation (10 Agustus 2026) — replaces the ComingSoonState
// placeholder. `services` (packages/db/migrations/0002_catalog_and_clients.sql)
// is a REAL table with exactly the fields the old placeholder promised
// (pricing, categories, active/inactive) — this isn't new data, it just
// never had an admin UI. Two "generations" of rows live in it side by side:
// the 4 broad categories from 0017/0018 (animation, digital_assets,
// website_development, game_development) mirror
// apps/studio/modules/order/data/categories/*.ts, the code-defined catalog
// actually shown on the public /order form; the 9 narrow categories from
// 0001/0008 (3d_animation, game_trailer, ...) are what the OLD Order
// Service form used and are unused today (that form — OrderForm.tsx/actions.ts
// in apps/studio/app/dashboard/orders — is dead code, on the P2 cleanup
// list). Grouped into two sections below so that distinction stays visible
// instead of mixing them.
export type ServiceCategory =
  | "animation"
  | "digital_assets"
  | "website_development"
  | "game_development"
  | "3d_animation"
  | "2d_animation"
  | "game_trailer"
  | "product_visualization"
  | "motion_graphics"
  | "logo_animation"
  | "game_asset"
  | "ui_animation"
  | "custom_project";

export type ServiceRow = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  base_price: number | null;
  is_active: boolean;
  created_at: string;
};

const LIVE_CATEGORIES = new Set<ServiceCategory>([
  "animation",
  "digital_assets",
  "website_development",
  "game_development",
]);

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  animation: "Animation",
  digital_assets: "Digital Assets",
  website_development: "Website Development",
  game_development: "Game Development",
  "3d_animation": "3D Animation",
  "2d_animation": "2D Animation",
  game_trailer: "Game Trailer",
  product_visualization: "Product Visualization",
  motion_graphics: "Motion Graphics",
  logo_animation: "Logo Animation",
  game_asset: "Game Asset",
  ui_animation: "UI Animation",
  custom_project: "Custom Project",
};

// The two "generations" of rows are priced in different currencies — see
// 0018_order_catalog_services_seed.sql's own comment on why (0008's legacy
// rows are IDR, matching the old Order Service form; 0018's live-catalog
// rows are plain USD, matching the /order configurator and every
// _usd-suffixed orders column). Formatting each with its real currency
// rather than picking one avoids silently misrepresenting the other set's
// numbers.
function formatPrice(basePrice: number | null, isLive: boolean) {
  if (basePrice === null) return "Custom pricing";
  if (isLive) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(basePrice);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(basePrice);
}

function ServiceRowItem({ service }: { service: ServiceRow }) {
  const [isPending, startTransition] = React.useTransition();
  const [isEditing, setIsEditing] = React.useState(false);
  const [priceInput, setPriceInput] = React.useState(
    service.base_price != null ? String(service.base_price) : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const isLive = LIVE_CATEGORIES.has(service.category);

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setServiceActiveAction(service.id, !service.is_active);
      if (!result.success) setError(result.error);
    });
  }

  function savePrice() {
    setError(null);
    const trimmed = priceInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setError("Enter a valid price.");
      return;
    }
    startTransition(async () => {
      const result = await updateServicePriceAction(service.id, value);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  function cancelEdit() {
    setIsEditing(false);
    setError(null);
    setPriceInput(service.base_price != null ? String(service.base_price) : "");
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{service.name}</p>
          <span className={cn("text-xs font-medium", service.is_active ? "text-emerald-300" : "text-white/40")}>
            {service.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        {service.description ? (
          <p className="mt-0.5 max-w-xl truncate text-xs text-white/45">{service.description}</p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              autoFocus
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              placeholder="Custom"
              className="w-28 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={savePrice}
              className="rounded-md bg-emerald-500 p-1.5 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-white/10 p-1.5 text-white/60 transition-colors hover:bg-white/[0.06]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <span className="text-sm font-semibold text-white">{formatPrice(service.base_price, isLive)}</span>
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={toggleActive}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <Power className="h-3.5 w-3.5" aria-hidden="true" />
          {service.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

function groupByCategory(list: ServiceRow[]) {
  const groups = new Map<ServiceCategory, ServiceRow[]>();
  for (const service of list) {
    const group = groups.get(service.category) ?? [];
    group.push(service);
    groups.set(service.category, group);
  }
  return groups;
}

export function ServicesList({ services }: { services: ServiceRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(q) || CATEGORY_LABELS[service.category].toLowerCase().includes(q),
    );
  }, [services, query]);

  const liveGroups = groupByCategory(filtered.filter((s) => LIVE_CATEGORIES.has(s.category)));
  const legacyGroups = groupByCategory(filtered.filter((s) => !LIVE_CATEGORIES.has(s.category)));

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No services in the catalog yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services or categories..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {liveGroups.size > 0 ? (
        <div className="flex flex-col gap-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Live Catalog — mirrors the public /order form
          </h2>
          {Array.from(liveGroups.entries()).map(([category, group]) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white/70">{CATEGORY_LABELS[category]}</h3>
              {group.map((service) => (
                <ServiceRowItem key={service.id} service={service} />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {legacyGroups.size > 0 ? (
        <div className="flex flex-col gap-5 border-t border-white/[0.08] pt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Legacy — from the old Order Service form, not used by /order today
          </h2>
          {Array.from(legacyGroups.entries()).map(([category, group]) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-white/70">{CATEGORY_LABELS[category]}</h3>
              {group.map((service) => (
                <ServiceRowItem key={service.id} service={service} />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
          No services match &ldquo;{query}&rdquo;.
        </div>
      ) : null}
    </div>
  );
}
