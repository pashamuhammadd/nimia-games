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
// Every "Explore Service" / package CTA points at /dashboard/orders, the
// existing generic order form (service picked from a dropdown there) —
// same reasoning as the previous 3-card version of this page: only
// "2D Animation" has a literal 1:1 row in the Supabase `services` table,
// so there's no reliable per-category service id to preselect for the
// others yet. Revisit once dedicated service/package rows exist.
export const ORDER_HREF = "/dashboard/orders";

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
export const CORE_SERVICES: CoreService[] = [
  {
    id: "animation",
    title: "Animation",
    badge: "⭐ Most Popular",
    price: "$25",
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
    price: "$200",
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

// SECTION 5 — Optional Add-ons (small cards).
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

// SECTION 6 — Featured Packages. Prices are placeholder starting points
// (bundles priced above each package's single-service base price from
// CORE_SERVICES) — easy to tune later, this is the only place they live.
export const FEATURED_PACKAGES: FeaturedPackage[] = [
  {
    name: "Animation Starter",
    description: "A focused animation bundle to bring one character or scene to life.",
    price: "$150",
  },
  {
    name: "Game Prototype Package",
    description: "Go from concept to a playable prototype, ready to test and pitch.",
    price: "$800",
  },
  {
    name: "Business Website Package",
    description: "A complete, launch-ready website for your business or startup.",
    price: "$350",
  },
];
