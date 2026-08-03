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
