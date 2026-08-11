import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  Gamepad2,
  Globe,
  PenTool,
  Palette,
  Volume2,
  Music,
  Server,
  Link2,
  Wrench,
  Gauge,
} from "lucide-react";

// Single source of truth for the /services page content (redesign brief,
// 29 Juli 2026 — 7-section structure: Hero, Core Services, Explore Our
// Services, Project Types, Add-ons, Featured Packages, CTA). Kept as plain
// data separate from the section components so copy/pricing can be edited
// in one place without touching layout/animation code.
//
// Every "Explore Service" / package CTA points at /order, the Project
// Configurator (Steps: Category -> Service -> Package -> Configure -> Brief
// -> Upload -> Review -> Submit — see modules/order). Previously pointed at
// /dashboard/orders, the older generic order form; that page still exists
// but is no longer linked from the public marketing pages now that /order
// covers the full flow with a real per-service catalog.
export const ORDER_HREF = "/order";

export interface CoreService {
  id: "animation" | "game-development" | "website-development";
  title: string;
  badge?: string;
  price: string;
  description: string;
  icon: LucideIcon;
}

// SECTION 2 — Core Services. Exactly 3, order fixed, no images/screenshots
// per brief.
//
// Prices repriced 10 Agst 2026 per "ATURAN PRICING NIMIA STUDIO 2026" —
// each is the entry-point price (cheapest real service) from its category's
// full catalog in modules/order/data/categories/*.ts:
//   Animation          -> Logo Animation Starter, $75
//   Game Development   -> Prototype, $500
//   Website Development-> Landing Page, $450
// Digital Assets (entry point $60, Thumbnail Starter) has no card here —
// this section is fixed at exactly 3 cards per the original design brief
// and CoreService.id only supports these 3 categories; adding a 4th card
// would be a UI/type structural change outside this pricing-only pass. See
// the repricing summary sent to the studio for this exact flag.
export const CORE_SERVICES: CoreService[] = [
  {
    id: "animation",
    title: "Animation",
    badge: "⭐ Most Popular",
    price: "$75",
    description:
      "Create high-quality 2D and 3D animations for games, brands, marketing, and digital experiences.",
    icon: Clapperboard,
  },
  {
    id: "game-development",
    title: "Game Development",
    price: "$500",
    description:
      "Build engaging games from prototype to production for mobile, PC, and web platforms.",
    icon: Gamepad2,
  },
  {
    id: "website-development",
    title: "Website Development",
    price: "$450",
    description:
      "Modern, responsive, and high-performance websites designed to grow your business.",
    icon: Globe,
  },
];

export interface ServiceDetailBlock {
  id: CoreService["id"];
  title: string;
  description: string;
  items: string[];
  /**
   * 4:3 thumbnail shown next to this block's copy (11 Agustus 2026, per
   * user request — replaces the abstract SVG visual that used to fill
   * this spot, see app/components/services/visuals.tsx). Files aren't in
   * the repo yet — the user is preparing 3 real 4:3 images; until each
   * one is dropped in at this exact path, ExploreServicesSection.tsx will
   * render a broken image here (next/image doesn't fail the build for a
   * missing public/ file, it just 404s at request time).
   */
  thumbnailSrc: string;
}

// SECTION 3 — Explore Our Services. Anchor ids match CORE_SERVICES ids so
// each card's "Explore Service" button smooth-scrolls straight to its own
// detail block instead of leaving the page.
export const SERVICE_DETAILS: ServiceDetailBlock[] = [
  {
    id: "animation",
    title: "Animation",
    description:
      "Expressive, production-ready animation for games, brands, and marketing.",
    thumbnailSrc: "/services/explore/animation.webp",
    items: [
      "Character Animation",
      "Logo Animation",
      "Motion Graphics",
      "Explainer Video",
      "Frame-by-frame Animation",
      "3D Animation",
      "Game Animation",
      "Social Media Animation",
    ],
  },
  {
    id: "game-development",
    title: "Game Development",
    description:
      "Full-cycle game development from first prototype to a shipped, polished build.",
    thumbnailSrc: "/services/explore/game-development.webp",
    items: [
      "Full Game Development",
      "Unity Development",
      "Mobile Game",
      "PC Game",
      "Multiplayer",
      "Prototype",
      "Web3 Integration",
    ],
  },
  {
    id: "website-development",
    title: "Website Development",
    description:
      "Fast, modern, and responsive websites built to convert and scale.",
    thumbnailSrc: "/services/explore/website-development.webp",
    items: [
      "Landing Page",
      "Company Website",
      "Dashboard",
      "Portfolio Website",
      "Web App",
      "CMS",
      "Responsive Design",
    ],
  },
];

// SECTION 4 — Project Types (chips).
export const PROJECT_TYPES: { emoji: string; label: string }[] = [
  { emoji: "🎮", label: "Indie Games" },
  { emoji: "📱", label: "Mobile Apps" },
  { emoji: "🏢", label: "Company Websites" },
  { emoji: "🚀", label: "Startup MVP" },
  { emoji: "🎬", label: "Animated Ads" },
  { emoji: "🛒", label: "Landing Pages" },
  { emoji: "📖", label: "Educational Games" },
  { emoji: "🎨", label: "Brand Animation" },
];

export interface AddonItem {
  label: string;
  icon: LucideIcon;
}

// SECTION 5 — Optional Add-ons (small cards). Deliberately no pricing here
// (brief only lists names) — unchanged by this repricing pass since the
// 2026 brief didn't provide standalone prices for these.
export const ADDONS: AddonItem[] = [
  { label: "UI Design", icon: PenTool },
  { label: "Illustration", icon: Palette },
  { label: "Sound Effects", icon: Volume2 },
  { label: "Background Music", icon: Music },
  { label: "Hosting", icon: Server },
  { label: "Domain Setup", icon: Link2 },
  { label: "Maintenance", icon: Wrench },
  { label: "Performance Optimization", icon: Gauge },
];

export interface FeaturedPackage {
  name: string;
  description: string;
  price: string;
}

// SECTION 6 — Featured Packages. Repriced 10 Agst 2026 per the studio's
// instruction to swap out the old placeholder prices for ones consistent
// with the new catalog, WITHOUT building new bundle logic in this pass
// (real package/bundle work — including a Web3 bundle — is a separate,
// later task). "Game Prototype Package" renamed to "Game MVP Package" to
// match the new Game MVP service instead of advertising Prototype (which
// is the proof-of-concept tier, not really a "package" experience).
export const FEATURED_PACKAGES: FeaturedPackage[] = [
  {
    name: "Animation Starter",
    description: "A focused animation bundle to bring one character or scene to life.",
    price: "$225",
  },
  {
    name: "Game MVP Package",
    description: "Go from concept to a playable MVP, ready to test and pitch.",
    price: "$1,200",
  },
  {
    name: "Business Website Package",
    description: "A complete, launch-ready website for your business or startup.",
    price: "$700",
  },
];
