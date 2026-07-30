import {
  Sprout,
  Users,
  Home,
  ShoppingCart,
  Zap,
  Footprints,
  Trophy,
  Star,
  type LucideIcon,
} from "lucide-react";

// Central data source for the Portfolio Preview page (30 Juli 2026 brief).
// This page is a TEASER, not the full portfolio — the complete collection
// will live on its own subdomain, portfolio.nimiagames.com (planned in the
// 3-subdomain architecture described in docs/ARCHITECTURE.md; that
// subdomain is not built yet as of this session). Every CTA on this page
// points there already, so nothing here needs to change once it ships.
export const FULL_PORTFOLIO_URL = "https://portfolio.nimiagames.com";

export interface TickerVideo {
  id: string;
  src: string;
}

// Every source below is a Cloudinary /video/upload/ delivery URL, so it's
// safe to blindly insert f_auto,q_auto (format + quality auto-negotiation)
// right after /video/upload/ for all of them, per the brief.
function optimizeCloudinaryUrl(url: string): string {
  return url.replace("/video/upload/", "/video/upload/f_auto,q_auto/");
}

// Cloudinary can derive a still-frame JPG straight from a video resource:
// keep the same /video/upload/ path, add so_0 (grab the frame at 0s) plus
// f_auto,q_auto, and swap the file extension for .jpg. Used for the
// Featured Showcase's click-to-play poster images (30 Juli 2026 correction
// — that section no longer autoplays, so each video needs a real thumbnail
// instead of showing a black frame until the user clicks play).
function cloudinaryPosterUrl(url: string): string {
  return url
    .replace("/video/upload/", "/video/upload/so_0,f_auto,q_auto/")
    .replace(/\.mp4$/i, ".jpg");
}

// TICKER ROW 1 — 1:1 clips, scrolls right, ~25s loop.
export const TICKER_ROW_1: TickerVideo[] = [
  {
    id: "ticker-1-a",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785258898/VID_20250617_003641_288_ks1kzf.mp4",
    ),
  },
  {
    id: "ticker-1-b",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785258890/jeet_sacrifice_ritual_V1_q1hv7g.mp4",
    ),
  },
  {
    id: "ticker-1-c",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785258901/VID_20250918_144032_442.mp4_nwezsu.mp4",
    ),
  },
  {
    id: "ticker-1-d",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785258898/VID_20250521_185254_752_ef0myz.mp4",
    ),
  },
  {
    id: "ticker-1-e",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785258895/VID_20250508_182212_817_hcz6zi.mp4",
    ),
  },
];

// TICKER ROW 2 — 16:9 clips, scrolls left, slightly slower loop than row 1.
export const TICKER_ROW_2: TickerVideo[] = [
  {
    id: "ticker-2-a",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385121/Apustaja_In_Bedroom_1_dlznsb.mp4",
    ),
  },
  {
    id: "ticker-2-b",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385121/Peepo_Smoke_qsyen6.mp4",
    ),
  },
  {
    id: "ticker-2-c",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385122/VID-20250516-WA0000_hi06rs.mp4",
    ),
  },
  {
    id: "ticker-2-d",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385122/Apustaja_hk8cru.mp4",
    ),
  },
  {
    id: "ticker-2-e",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385124/VID-20250524-WA0000_aqvkgj.mp4",
    ),
  },
];

export interface ShowcaseItem {
  id: string;
  src: string;
  poster: string;
  /** Not rendered as visible text (per 30 Juli 2026 correction) — used only
   *  for the play button's aria-label so screen reader users still know
   *  what each clip is. */
  label: string;
}

// FEATURED SHOWCASE — 3 large videos, click-to-play with sound (30 Juli
// 2026 correction). Labels are the placeholder examples given directly in
// the original brief; swap for real project names/categories once the
// user sends them (see comment in FeaturedShowcase.tsx for how they're
// used now).
export const FEATURED_SHOWCASE: ShowcaseItem[] = [
  {
    id: "showcase-1",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385218/VID-20240926-WA0000_ilapsv.mp4",
    ),
    poster: cloudinaryPosterUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385218/VID-20240926-WA0000_ilapsv.mp4",
    ),
    label: "Animation",
  },
  {
    id: "showcase-2",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385217/Mouse_Zombie_yutlhv.mp4",
    ),
    poster: cloudinaryPosterUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385217/Mouse_Zombie_yutlhv.mp4",
    ),
    label: "Motion Graphics",
  },
  {
    id: "showcase-3",
    src: optimizeCloudinaryUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385223/To_the_Moon_or_Not_-1_j8ctpi.mp4",
    ),
    poster: cloudinaryPosterUrl(
      "https://res.cloudinary.com/wudw6mex/video/upload/v1785385223/To_the_Moon_or_Not_-1_j8ctpi.mp4",
    ),
    label: "Game Trailer",
  },
];

export interface FeaturedGame {
  id: string;
  name: string;
  /** Genre / category line shown under the game name, e.g. "2D Cozy Life
   *  Simulation". */
  category: string;
  status: "In Development" | "Playable";
  description: string;
  /** CTA label only — GameCard renders its own arrow icon next to this,
   *  so this should NOT include a trailing arrow character. */
  ctaLabel: string;
  /** Primary CTA target — where the "Play Now" / "Learn More" button
   *  goes. Not necessarily the same domain as `websiteHref` (e.g. a
   *  dedicated play.* subdomain vs. the marketing site). */
  href: string;
  /** "Official Website" link target, shown as the secondary CTA next to
   *  the primary button. Deliberately separate from `href` — some games
   *  point players to a different domain than their marketing site (e.g.
   *  a play.* subdomain, or a separate token/community site). */
  websiteHref: string;
  /** Optional image path/URL for the game's icon tile (square, ideally
   *  ≥128x128). Omit to fall back to the placeholder Gamepad2 tile in
   *  GameCard.tsx until the user sends real icons (per 30 Juli 2026
   *  brief: "Saya akan mengirim icon game secara terpisah"). */
  iconSrc?: string;
  /** Small icon+label chips shown in a row on the card (30 Juli 2026,
   *  second design pass — added to match an exact reference mockup the
   *  user sent). 4 per game in the reference; not a hard limit, the row
   *  wraps if a game needs more or fewer. */
  tags: { icon: LucideIcon; label: string }[];
}

// FEATURED GAMES — new section (30 Juli 2026 brief), rendered between
// Featured Showcase and the closing CTA. Premium game-storefront cards
// (Steam/Epic/Riot/Supercell/Ubisoft/PlayStation reference), 2 games so
// far. Add future games here as they're ready to announce; FeaturedGames.tsx
// already handles any array length via its grid + stagger animation.
export const FEATURED_GAMES: FeaturedGame[] = [
  {
    id: "lifetopia-world",
    name: "Lifetopia World",
    category: "2D Cozy Life Simulation",
    status: "In Development",
    description:
      "A cozy multiplayer life simulation game where players can farm, build, socialize, and explore a vibrant world designed for relaxing and meaningful adventures.",
    ctaLabel: "Play Now",
    href: "https://play.lifetopiaworld.io",
    websiteHref: "https://lifetopiaworld.io",
    iconSrc: "/games/lifetopia-world-icon.png",
    tags: [
      { icon: Sprout, label: "Farming" },
      { icon: Users, label: "Multiplayer" },
      { icon: Home, label: "Housing" },
      { icon: ShoppingCart, label: "Trading" },
    ],
  },
  {
    id: "lemmirun",
    name: "LemmiRun",
    category: "3D Endless Runner",
    status: "Playable",
    description:
      "A fast-paced endless runner game featuring colorful environments, exciting obstacles, and addictive gameplay designed for players of all ages.",
    ctaLabel: "Play Now",
    href: "https://lemmirun.cloud",
    websiteHref: "https://lemmicoin.com",
    iconSrc: "/games/lemmirun-icon.png",
    tags: [
      { icon: Zap, label: "Fast-Paced" },
      { icon: Footprints, label: "Endless Run" },
      { icon: Trophy, label: "Leaderboard" },
      { icon: Star, label: "Power-Ups" },
    ],
  },
];
