// Nimia Studio's animation service knowledge base — the fixed vocabulary
// the AI Client Hunter is allowed to match prospects against. This list
// comes directly from the "Animation Services Knowledge" section of the
// AI Client Hunter brief (12 categories) — do NOT add a service here that
// Nimia doesn't actually offer; the qualification engine's `serviceFit`
// score and `detectedService`/`animationType` fields are only ever
// allowed to point at one of these.
//
// Related but distinct from `public.services` (packages/db/migrations/
// 0018_order_catalog_services_seed.sql, the priced /order catalog) — that
// table's 'animation' category has 9 rows using slightly different naming
// (e.g. "Trailer" not "Trailer Project", "Story Animation" not "Short
// Story Animation"). This list is the AI's own taxonomy for *identifying
// intent* from unstructured prospect text, which needs to be broader
// (e.g. "Meme Animation", "Game Cutscene") than the priced catalog — see
// each entry's `catalogServiceName` for its closest /order equivalent
// where one exists, used only for display, never to restrict matching.
//
// Nimia specializes in frame-by-frame animation — every category below is
// frame-by-frame 2D work, so "do they want 3D/rigged real-time animation
// only" is a soft negative signal the scoring engine can use, not a hard
// disqualifier (a prospect rarely specifies 2D vs 3D up front).

export type AnimationServiceCategory = {
  id: string;
  label: string;
  description: string;
  /** Lowercase phrases matched against candidate text. Ordered roughly
   * most-specific-first; matching is substring-based (see
   * detectAnimationServices below), not fuzzy/NLP. */
  keywords: string[];
  /** Closest row in `public.services` (category = 'animation'), for
   * display only — see this file's own header comment. */
  catalogServiceName: string | null;
};

export const ANIMATION_SERVICE_CATEGORIES: AnimationServiceCategory[] = [
  {
    id: "2d-animation",
    label: "2D Animation",
    description: "General 2D / frame-by-frame animation work.",
    keywords: ["2d animation", "2d animator", "hand-drawn animation", "frame-by-frame", "frame by frame animation"],
    catalogServiceName: null,
  },
  {
    id: "gif-sticker",
    label: "GIF / Sticker Social Media",
    description: "Loopable animated GIFs and sticker packs for social/community use.",
    keywords: ["gif animation", "sticker pack", "animated sticker", "animated gif", "telegram sticker", "discord emote", "looping animation"],
    catalogServiceName: "GIF / Sticker",
  },
  {
    id: "character-animation",
    label: "Character Animation",
    description: "Expressive character performance/animation for any scene.",
    keywords: ["character animation", "character animator", "rigged character", "character rig", "animate our character", "animate a character"],
    catalogServiceName: "Character Animation",
  },
  {
    id: "game-animation",
    label: "Game Animation",
    description: "Idle/walk/attack/combo cycles and other in-game sprite or skeletal animation.",
    keywords: ["game animation", "sprite animation", "walk cycle", "idle animation", "attack animation", "combat animation", "animation for our game"],
    catalogServiceName: "Game Animation",
  },
  {
    id: "game-cutscene",
    label: "Game Cutscene",
    description: "In-game cinematic sequences and cutscenes.",
    keywords: ["cutscene", "in-game cinematic", "game cinematic", "opening cinematic"],
    catalogServiceName: null,
  },
  {
    id: "trailer",
    label: "Trailer Project",
    description: "Cinematic trailers for games, apps, and launches.",
    keywords: ["game trailer", "launch trailer", "teaser trailer", "trailer for our game", "announcement trailer", "reveal trailer"],
    catalogServiceName: "Trailer",
  },
  {
    id: "story-animation",
    label: "Short Story Animation",
    description: "Narrative short-form animation with multiple scenes.",
    keywords: ["animated short film", "short story animation", "narrative animation", "animated short"],
    catalogServiceName: "Story Animation",
  },
  {
    id: "meme-animation",
    label: "Meme Animation",
    description: "Animated memes for social/community engagement.",
    keywords: ["meme animation", "animated meme", "meme video"],
    catalogServiceName: null,
  },
  {
    id: "motion-graphic",
    label: "Motion Graphic",
    description: "Kinetic type and graphic motion for ads and intros.",
    keywords: ["motion graphics", "motion graphic", "kinetic typography", "animated intro", "animated ad"],
    catalogServiceName: "Motion Graphic",
  },
  {
    id: "ui-animation",
    label: "UI Animation",
    description: "Micro-interactions and screen transitions for apps.",
    keywords: ["ui animation", "app animation", "micro-interaction", "interface animation", "screen transition animation"],
    catalogServiceName: "UI Animation",
  },
  {
    id: "logo-animation",
    label: "Logo Animation",
    description: "A signature motion reveal for a brand mark.",
    keywords: ["logo animation", "logo reveal", "logo intro animation", "animate our logo"],
    catalogServiceName: "Logo Animation",
  },
  {
    id: "explainer-animation",
    label: "Explainer Animation",
    description: "Clear, friendly animation that explains a product.",
    keywords: ["explainer video", "explainer animation", "product explainer", "animated explainer"],
    catalogServiceName: "Explainer Animation",
  },
];

/** Generic fallback signal — present in text that's clearly about
 * animation work but doesn't cleanly match one of the 12 categories
 * above (e.g. just "need an animator"). Used by the scoring engine as a
 * weaker service-fit signal than a specific category match. */
const GENERIC_ANIMATION_KEYWORDS = [
  "animator",
  "animation studio",
  "animate this",
  "need animation",
  "looking for an animation",
];

export type AnimationServiceMatch = {
  category: AnimationServiceCategory;
  matchedKeywords: string[];
};

/** Substring-matches `text` (already lowercased by the caller ideally,
 * but this lowercases defensively) against every category's keyword
 * list. Returns categories with at least one hit, most-matches-first —
 * deliberately simple/deterministic (no fuzzy matching, no ML) so the
 * scoring engine's serviceFit factor stays explainable per the spec's
 * "every score must have reasons" requirement. */
export function detectAnimationServices(text: string): AnimationServiceMatch[] {
  const lower = text.toLowerCase();
  const matches: AnimationServiceMatch[] = [];

  for (const category of ANIMATION_SERVICE_CATEGORIES) {
    const matchedKeywords = category.keywords.filter((kw) => lower.includes(kw));
    if (matchedKeywords.length > 0) {
      matches.push({ category, matchedKeywords });
    }
  }

  return matches.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
}

export function hasGenericAnimationSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return GENERIC_ANIMATION_KEYWORDS.some((kw) => lower.includes(kw));
}
