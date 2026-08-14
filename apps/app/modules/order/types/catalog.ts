import type { LucideIcon } from "lucide-react";
import type { ConfigField } from "./config";

/** One tier of a "Package" priced service (Step 3), e.g. GIF/Sticker's
 * Starter / Standard / Pro. */
export interface ServicePackage {
  id: string;
  name: string;
  /** e.g. "5 GIF", "10 GIF" — the quantity/scope this tier covers. */
  quantityLabel: string;
  price: number;
  deliveryDays: number;
  /** Marks the tier shown with a "Most Popular" ribbon. At most one per service. */
  highlight?: boolean;
}

export type PricingModel = "packages" | "startingFrom";

export interface ServiceDefinition {
  id: string;
  /** Real `services.id` row this maps to in Supabase (3 Agustus 2026, per
   * user request — orders submitted from /order now write a real
   * `orders.service_id` instead of leaving it null). Fixed uuid, must match
   * exactly what packages/db/migrations/0018_order_catalog_services_seed.sql
   * inserts for this same service — the two are kept in lockstep by hand,
   * there's no codegen linking them. */
  dbServiceId: string;
  categoryId: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  pricingModel: PricingModel;
  /** Required when pricingModel === "packages". */
  packages?: ServicePackage[];
  /** Required when pricingModel === "startingFrom". */
  startingPrice?: number;
  /** Delivery estimate for a "startingFrom" service; ignored for "packages"
   * services, which carry their own deliveryDays per tier. */
  baseDeliveryDays?: number;
  /** Step 4's entire configuration UI for this service — see ../types/config.ts. */
  configFields: ConfigField[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  services: ServiceDefinition[];
}
