import { Rocket, Sparkles, Globe, Gamepad2, Monitor } from "lucide-react";
import type { BundlePackage } from "../types/bundle";

// Single source of truth for the Package/Bundle system (10 Agustus 2026,
// per user request) — every package card, the package detail view, price
// calculation, and order submission all read from this one array. Adding,
// editing, or reordering a package only ever touches this file, exactly
// like ../data/categories/*.ts is the single source of truth for Project
// Builder's individual services.
//
// Exactly 6 packages, ONLY these 6 — explicitly no NFT/AI/Meme
// Token/Animation/Social Media/Enterprise package yet (future phase, per
// the brief). Display order below is also the browse-grid order: Web3
// Launch, Web3 Growth, Web3 Launch Pro, Game Asset Pack, Startup Website,
// Game MVP.
export const BUNDLE_PACKAGES: BundlePackage[] = [
  {
    id: "web3-launch",
    name: "Web3 Launch",
    category: "web3",
    subcategory: "web3-launch",
    badge: "BEST VALUE",
    price: 500,
    description: "Everything you need to launch your Web3 project with a professional digital presence.",
    icon: Rocket,
    includedItems: [
      {
        label: "1 Responsive Landing Page",
        details: [
          "Desktop responsive",
          "Mobile responsive",
          "Custom UI",
          "Basic SEO optimization",
          "CTA section",
          "Social/community links",
          "Basic animation",
          "Deployment",
        ],
      },
      { label: "1 Custom Mascot/Character Design" },
      { label: "5 GIF/Stickers" },
      { label: "3 Social Media Banners" },
      { label: "3 Promotional Illustrations" },
    ],
    creativeSlotCount: 1,
    creativeSlotLabel: "Choose 1 Creative Content",
    creativeOptions: [
      { id: "web3-launch-logo-animation", label: "Logo Animation (up to 10 sec)", slots: 1 },
      { id: "web3-launch-character-animation", label: "Character Animation (up to 10 sec)", slots: 1 },
      { id: "web3-launch-meme-animation", label: "Meme Animation (meme animation pack)", slots: 1 },
      { id: "web3-launch-promotional-animation", label: "Promotional Animation (up to 10 sec)", slots: 1 },
    ],
    freeRevisions: 2,
    // Verbatim from the brief.
    estimatedDeliveryLabel: "7–10 business days",
  },
  {
    id: "web3-growth",
    name: "Web3 Growth",
    category: "web3",
    subcategory: "web3-growth",
    badge: "MOST POPULAR",
    featured: true,
    price: 1000,
    description:
      "Build a recognizable Web3 brand and keep your community engaged with consistent visual content.",
    icon: Sparkles,
    includedItems: [
      {
        label: "1 Professional Responsive Landing Page",
        details: [
          "Responsive desktop/mobile",
          "Custom UI",
          "SEO optimization",
          "Social/community integration",
          "CTA section",
          "Basic animation",
          "Deployment",
        ],
      },
      { label: "1 Custom Mascot/Character Design" },
      { label: "10 GIF/Stickers" },
      { label: "6 Social Media Banners" },
      { label: "5 Promotional Illustrations" },
    ],
    creativeSlotCount: 2,
    creativeSlotLabel: "Choose 2 Creative Content",
    creativeOptions: [
      { id: "web3-growth-logo-animation", label: "Logo Animation (up to 10 sec)", slots: 1 },
      { id: "web3-growth-character-animation", label: "Character Animation (up to 10 sec)", slots: 1 },
      { id: "web3-growth-meme-animation", label: "Meme Animation Pack", slots: 1 },
      { id: "web3-growth-promotional-animation", label: "Promotional Animation (up to 10 sec)", slots: 1 },
      { id: "web3-growth-story-animation", label: "Story Animation (up to 10 sec)", slots: 1 },
    ],
    freeRevisions: 2,
    // Estimated — the brief only gave a verbatim range for Web3 Launch.
    // Derived from Web3 Growth's larger asset scope over the same
    // single-landing-page core; see this task's final implementation report.
    estimatedDeliveryLabel: "10–14 business days",
  },
  {
    id: "web3-launch-pro",
    name: "Web3 Launch Pro",
    category: "web3",
    subcategory: "web3-pro",
    badge: "PRO",
    price: 1800,
    description: "A complete digital and creative launch system for serious Web3 projects.",
    icon: Globe,
    includedItems: [
      {
        label: "Premium Responsive Landing Page",
        details: [
          "Responsive desktop/mobile",
          "Custom UI",
          "SEO optimization",
          "Performance optimization",
          "Advanced sections",
          "CTA section",
          "Social/community integration",
          "Deployment",
        ],
      },
      { label: "1 Custom Mascot/Character Design" },
      { label: "1 Character Turnaround/Concept Sheet" },
      { label: "20 GIF/Stickers" },
      { label: "12 Social Media Banners" },
      { label: "6 Promotional Illustrations" },
    ],
    creativeSlotCount: 3,
    creativeSlotLabel: "Choose 3 Creative Slots",
    creativeOptions: [
      { id: "web3-pro-logo-animation", label: "Logo Animation (up to 10 sec)", slots: 1 },
      { id: "web3-pro-character-animation-10", label: "Character Animation (up to 10 sec)", slots: 1 },
      { id: "web3-pro-character-animation-20", label: "Character Animation (up to 20 sec)", slots: 2 },
      { id: "web3-pro-meme-animation", label: "Meme Animation Pack", slots: 1 },
      { id: "web3-pro-promotional-video", label: "Promotional Video/Animation (up to 20 sec)", slots: 2 },
      { id: "web3-pro-story-animation", label: "Story Animation (up to 20 sec)", slots: 2 },
    ],
    freeRevisions: 2,
    // Estimated — largest Web3 tier, scaled up from Web3 Launch/Growth.
    estimatedDeliveryLabel: "14–18 business days",
  },
  {
    id: "game-asset-pack",
    name: "Game Asset Pack",
    category: "game",
    subcategory: "game-assets",
    price: 500,
    description: "Essential visual assets for indie games, mobile games, and Web3 games.",
    icon: Gamepad2,
    includedItems: [
      { label: "1 Character Design" },
      { label: "1 Sprite Sheet" },
      { label: "10 Game Icons" },
      { label: "1 Environment Scene" },
      { label: "32 Tiles" },
    ],
    creativeSlotCount: 1,
    creativeSlotLabel: "Choose 1",
    creativeOptions: [
      { id: "game-assets-character-animation-set", label: "Character Animation Set", slots: 1 },
      { id: "game-assets-ui-kit", label: "UI Kit", slots: 1 },
      { id: "game-assets-additional-sprite-sheet", label: "Additional Sprite Sheet", slots: 1 },
      { id: "game-assets-additional-environment", label: "Additional Environment Asset", slots: 1 },
      { id: "game-assets-additional-tileset", label: "Additional Tileset", slots: 1 },
    ],
    freeRevisions: 2,
    // Estimated — asset-only scope, no landing page or dev work.
    estimatedDeliveryLabel: "5–8 business days",
  },
  {
    id: "startup-website",
    name: "Startup Website",
    category: "website",
    subcategory: "website",
    price: 700,
    description: "A professional, responsive website for startups, businesses, Web3 projects, and digital products.",
    icon: Monitor,
    includedItems: [
      {
        label: "Website (up to 5 pages)",
        details: [
          "Responsive desktop/mobile",
          "Custom UI",
          "SEO optimization",
          "Basic animations",
          "Contact form",
          "Social media integration",
          "Deployment",
          "Performance optimization",
        ],
      },
    ],
    creativeSlotCount: 1,
    creativeSlotLabel: "Choose 1",
    creativeOptions: [
      { id: "startup-website-blog-cms", label: "Blog/CMS", slots: 1 },
      { id: "startup-website-multilingual", label: "Multilingual Support", slots: 1 },
      { id: "startup-website-ai-integration", label: "AI Integration", slots: 1 },
      { id: "startup-website-advanced-animation", label: "Advanced Animation", slots: 1 },
      { id: "startup-website-landing-section", label: "Additional Landing Section/Campaign Page", slots: 1 },
    ],
    freeRevisions: 2,
    // Estimated — comparable scope to a landing-page build, up to 5 pages.
    estimatedDeliveryLabel: "7–10 business days",
  },
  {
    id: "game-mvp",
    name: "Game MVP",
    category: "game",
    subcategory: "game-development",
    badge: "RECOMMENDED",
    price: 1200,
    description: "A playable MVP built to validate your game's core mechanics, gameplay loop, and concept.",
    icon: Gamepad2,
    includedItems: [
      {
        label: "Playable Game MVP",
        details: [
          "Core gameplay loop",
          "Basic UI",
          "Basic game assets",
          "Main menu",
          "Win/lose state",
          "Basic audio integration",
          "Basic deployment",
          "Playable build",
        ],
      },
    ],
    creativeSlotCount: 1,
    creativeSlotLabel: "Choose 1 Bonus",
    creativeOptions: [
      { id: "game-mvp-character-animation-pack", label: "Character Animation Pack", slots: 1 },
      { id: "game-mvp-additional-scene", label: "Additional Game Scene", slots: 1 },
      { id: "game-mvp-leaderboard", label: "Basic Leaderboard", slots: 1 },
      { id: "game-mvp-backend-integration", label: "Basic Backend Integration", slots: 1 },
      { id: "game-mvp-wallet-integration", label: "Basic Web3 Wallet Integration", slots: 1 },
    ],
    freeRevisions: 2,
    // Estimated — a playable MVP with a real gameplay loop is substantial
    // development work, longer than a static asset pack.
    estimatedDeliveryLabel: "12–16 business days",
  },
];

export function findBundlePackageById(packageId: string | null | undefined): BundlePackage | null {
  if (!packageId) return null;
  return BUNDLE_PACKAGES.find((pkg) => pkg.id === packageId) ?? null;
}
