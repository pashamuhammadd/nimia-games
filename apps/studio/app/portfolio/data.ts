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
// will live on its own subdomain, portfolio.nimiastudio.com (planned in the
// 3-subdomain architecture described in docs/ARCHITECTURE.md and
// [[studio_multi_app_split_plan]]; that subdomain is not built yet as of
// this session, so "View Full Portfolio" is a forward-pointing link until
// it ships). Every CTA on this page points there already, so nothing here
// needs to change once it ships.
export const FULL_PORTFOLIO_URL = "https://portfolio.nimiastudio.com";

// Video-security pass (30 Juli 2026 brief): every clip on this page used to
// point straight at a res.cloudinary.com URL, which meant the real
// Cloudinary origin/hash/filename shipped in the client JS bundle and page
// source for anyone to read or right-click "copy address" on. Now every
// `src`/`poster` below is just `/api/video/<id>` (optionally `?poster=1`) —
// our own Next.js route (app/api/video/[id]/route.ts) resolves the id to
// the actual Cloudinary URL SERVER-SIDE (see that route's sources.ts, which
// this file never imports) and proxies the bytes through our own origin.
// This isn't "undownloadable" (nothing served to a <video> tag can be), but
// it removes the trivial paths: no visible Cloudinary link anywhere in the
// page, and no filename/asset-id leak via the poster URL either.
function proxiedVideo(id: string): string {
  return `/api/video/${id}`;
}

function proxiedPoster(id: string): string {
  return `/api/video/${id}?poster=1`;
}

export interface TickerVideo {
  id: string;
  src: string;
}

// TICKER ROW 1 — 1:1 clips, scrolls right, ~25s loop.
export const TICKER_ROW_1: TickerVideo[] = [
  { id: "ticker-1-a", src: proxiedVideo("ticker-1-a") },
  { id: "ticker-1-b", src: proxiedVideo("ticker-1-b") },
  { id: "ticker-1-c", src: proxiedVideo("ticker-1-c") },
  { id: "ticker-1-d", src: proxiedVideo("ticker-1-d") },
  { id: "ticker-1-e", src: proxiedVideo("ticker-1-e") },
];

// TICKER ROW 2 — 16:9 clips, scrolls left, slightly slower loop than row 1.
export const TICKER_ROW_2: TickerVideo[] = [
  { id: "ticker-2-a", src: proxiedVideo("ticker-2-a") },
  { id: "ticker-2-b", src: proxiedVideo("ticker-2-b") },
  { id: "ticker-2-c", src: proxiedVideo("ticker-2-c") },
  { id: "ticker-2-d", src: proxiedVideo("ticker-2-d") },
  { id: "ticker-2-e", src: proxiedVideo("ticker-2-e") },
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
    src: proxiedVideo("showcase-1"),
    poster: proxiedPoster("showcase-1"),
    label: "Animation",
  },
  {
    id: "showcase-2",
    src: proxiedVideo("showcase-2"),
    poster: proxiedPoster("showcase-2"),
    label: "Motion Graphics",
  },
  {
    id: "showcase-3",
    src: proxiedVideo("showcase-3"),
    poster: proxiedPoster("showcase-3"),
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
