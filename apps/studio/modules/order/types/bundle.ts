import type { LucideIcon } from "lucide-react";

// Package/Bundle system (10 Agustus 2026, per user request) — a second,
// separate ordering concept from Step 3's `ServicePackage` "tier" (see
// ./catalog.ts's ServicePackage — that's a pricing tier of a SINGLE
// service, e.g. GIF/Sticker's Starter/Standard/Pro). A "Bundle" here is a
// predefined multi-service PROJECT bundle (landing page + mascot + GIFs +
// banners + ...) with a slot-based "choose your creative content" system.
// Deliberately named/typed distinctly (Bundle* prefix, its own file) so it
// never collides with the existing packages/pricingModel="packages" concept
// already used throughout the Project Builder flow.

export type BundleCategory = "web3" | "game" | "website";

export type BundleBadge = "BEST VALUE" | "MOST POPULAR" | "PRO" | "RECOMMENDED";

/** One line of a package's fixed "What's Included" checklist. `details`
 * renders as nested sub-bullets (e.g. a Landing Page's own feature list). */
export interface BundleIncludedItem {
  label: string;
  details?: string[];
}

/** One selectable option inside a package's "Choose Your Creative Content"
 * slot system. `slots` is how many of the package's creative-content slots
 * this option consumes — most options cost 1 slot; a few "up to 20 sec"
 * tiers in Web3 Launch Pro cost 2. Selection is enforced in
 * state/use-order-wizard.ts (toggleBundleCreativeContent) and mirrored in
 * the UI (components/package-detail.tsx disables any option that would
 * push the running total past creativeSlotCount) — an over-slot combination
 * like Character Animation(20s) + Promotional Video(20s) on Web3 Launch Pro
 * (2 + 2 = 4 slots against a 3-slot cap) can never actually be selected. */
export interface BundleCreativeOption {
  id: string;
  label: string;
  description?: string;
  slots: number;
}

export interface BundlePackage {
  id: string;
  name: string;
  category: BundleCategory;
  /** Only set where it adds real signal beyond `category` — deliberately
   * sparse per the brief ("avoid excessive taxonomy"). */
  subcategory?: string;
  badge?: BundleBadge;
  /** At most one package should set this — drives the single strongest
   * visual treatment on the browse grid (Web3 Growth's "Most Popular").
   * See components/option-card.tsx's `featured` prop. */
  featured?: boolean;
  price: number;
  description: string;
  icon: LucideIcon;
  includedItems: BundleIncludedItem[];
  /** How many creative-content slots this package grants. */
  creativeSlotCount: number;
  /** Label shown above the selector, e.g. "Choose 1 Creative Content",
   * "Choose 2 Creative Contents (3 Creative Slots)". */
  creativeSlotLabel: string;
  creativeOptions: BundleCreativeOption[];
  freeRevisions: number;
  /** A range, always framed as an estimate rather than a guarantee (see
   * components/package-detail.tsx's delivery note) — never a single
   * computed day count the way Project Builder's Estimate.totalDeliveryDays
   * is, since a bundle's real timeline depends on which creative content is
   * picked. Web3 Launch's "7–10 business days" is the one value the brief
   * gave verbatim; the other five are studio estimates derived from scope,
   * clearly flagged as such in this project's implementation report. */
  estimatedDeliveryLabel: string;
}
