// Nimia Studio's animation service knowledge base — the fixed vocabulary
// the AI Prospect Hunter is allowed to recommend to a prospect. This list
// comes directly from spec section 7 ("Nimia Animation Services", 12
// categories) — do NOT add a service here that Nimia doesn't actually
// offer; tools/scoreProject.ts's `recommendedServices` output is only
// ever allowed to point at one of these.
//
// Related but distinct from `public.services` (packages/db/migrations/
// 0018_order_catalog_services_seed.sql, the priced /order catalog) — see
// each entry's `catalogServiceName` for its closest /order equivalent
// where one exists, used only for display, never to restrict matching.
//
// V1 (the retired "AI Client Hunter") matched these against a prospect's
// own text via keyword search. V2 has no text to search — a project's
// CoinGecko category is matched against `recommendedFor` below instead
// (see recommendServicesForCategory). The service list itself is
// unchanged; only how a service gets recommended changed.
//
// Nimia specializes in frame-by-frame animation — every category below is
// frame-by-frame 2D work.

export type AnimationServiceCategory = {
  id: string;
  label: string;
  description: string;
  /** Closest row in `public.services` (category = 'animation'), for
   * display only — see this file's own header comment. */
  catalogServiceName: string | null;
  /** Project category "flavors" (not CoinGecko slugs — a small internal
   * vocabulary, see recommendServicesForCategory) this service is
   * commonly recommended for, per spec section 7's own examples. Ordered
   * by how central the flavor is to this service. */
  recommendedFor: ProjectFlavor[];
};

export type ProjectFlavor = "gaming" | "metaverse" | "nft" | "web3-entertainment" | "defi" | "meme" | "infrastructure" | "ai-web3";

export const ANIMATION_SERVICE_CATEGORIES: AnimationServiceCategory[] = [
  {
    id: "2d-animation",
    label: "2D Animation",
    description: "General 2D / frame-by-frame animation work.",
    catalogServiceName: null,
    recommendedFor: ["gaming", "metaverse", "nft", "web3-entertainment"],
  },
  {
    id: "gif-sticker",
    label: "GIF / Sticker Social Media",
    description: "Loopable animated GIFs and sticker packs for social/community use.",
    catalogServiceName: "GIF / Sticker",
    recommendedFor: ["meme", "nft", "web3-entertainment"],
  },
  {
    id: "character-animation",
    label: "Character Animation",
    description: "Expressive character performance/animation for any scene.",
    catalogServiceName: "Character Animation",
    recommendedFor: ["gaming", "nft", "metaverse", "meme"],
  },
  {
    id: "game-animation",
    label: "Game Animation",
    description: "Idle/walk/attack/combo cycles and other in-game sprite or skeletal animation.",
    catalogServiceName: "Game Animation",
    recommendedFor: ["gaming", "metaverse"],
  },
  {
    id: "game-cutscene",
    label: "Game Cutscene",
    description: "In-game cinematic sequences and cutscenes.",
    catalogServiceName: null,
    recommendedFor: ["gaming"],
  },
  {
    id: "trailer",
    label: "Trailer Project",
    description: "Cinematic trailers for games, apps, and launches.",
    catalogServiceName: "Trailer",
    recommendedFor: ["gaming", "metaverse", "nft"],
  },
  {
    id: "story-animation",
    label: "Short Story Animation",
    description: "Narrative short-form animation with multiple scenes.",
    catalogServiceName: "Story Animation",
    recommendedFor: ["nft", "web3-entertainment"],
  },
  {
    id: "meme-animation",
    label: "Meme Animation",
    description: "Animated memes for social/community engagement.",
    catalogServiceName: null,
    recommendedFor: ["meme"],
  },
  {
    id: "motion-graphic",
    label: "Motion Graphic",
    description: "Kinetic type and graphic motion for ads and intros.",
    catalogServiceName: "Motion Graphic",
    recommendedFor: ["defi", "infrastructure", "ai-web3"],
  },
  {
    id: "ui-animation",
    label: "UI Animation",
    description: "Micro-interactions and screen transitions for apps.",
    catalogServiceName: "UI Animation",
    recommendedFor: ["defi", "infrastructure", "ai-web3"],
  },
  {
    id: "logo-animation",
    label: "Logo Animation",
    description: "A signature motion reveal for a brand mark.",
    catalogServiceName: "Logo Animation",
    recommendedFor: ["meme", "defi", "gaming"],
  },
  {
    id: "explainer-animation",
    label: "Explainer Animation",
    description: "Clear, friendly animation that explains a product.",
    catalogServiceName: "Explainer Animation",
    recommendedFor: ["defi", "infrastructure", "ai-web3"],
  },
];

/** Maps a CoinGecko category slug to this file's own small
 * "flavor" vocabulary — deliberately coarser than the full tier list in
 * constants.ts, since service recommendation only needs "what KIND of
 * visual story does this project tell", not the full tier ranking used
 * for scoring. Falls back to "infrastructure" (the most conservative,
 * least visually-driven recommendation set) for anything unrecognized —
 * never silently recommends nothing. */
export function flavorForCategorySlug(slug: string): ProjectFlavor {
  const s = slug.toLowerCase();
  if (s.includes("gaming") || s.includes("play-to-earn")) return "gaming";
  if (s.includes("metaverse") || s.includes("virtual-reality")) return "metaverse";
  if (s.includes("nft") || s.includes("collectible")) return "nft";
  if (s.includes("entertainment") || s.includes("creator") || s.includes("social")) return "web3-entertainment";
  if (s.includes("meme") || s.includes("dog-themed") || s.includes("cat-themed")) return "meme";
  if (s.includes("defi") || s.includes("exchange") || s.includes("lending") || s.includes("payment") || s.includes("wallet")) return "defi";
  if (s.includes("ai")) return "ai-web3";
  return "infrastructure";
}

/** Returns Nimia services recommended for a project's categories, ranked
 * by how many of the project's own category flavors match each service —
 * deterministic and explainable (spec section 7's "do not recommend
 * services that are clearly unrelated"), never an LLM guess. Always
 * returns at least the top 2 services for the least-matched fallback
 * flavor rather than an empty list, since every project — even
 * infrastructure — has SOME plausible Nimia service (explainer/motion
 * graphic/UI animation, per spec section 7's DeFi example). */
export function recommendServicesForCategories(categorySlugs: string[]): AnimationServiceCategory[] {
  const flavors = categorySlugs.length > 0 ? categorySlugs.map(flavorForCategorySlug) : (["infrastructure"] as ProjectFlavor[]);
  const scored = ANIMATION_SERVICE_CATEGORIES.map((service) => ({
    service,
    hits: flavors.filter((f) => service.recommendedFor.includes(f)).length,
  })).filter((entry) => entry.hits > 0);

  if (scored.length === 0) {
    return ANIMATION_SERVICE_CATEGORIES.filter((s) => s.recommendedFor.includes("infrastructure")).slice(0, 3);
  }

  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 4)
    .map((entry) => entry.service);
}
