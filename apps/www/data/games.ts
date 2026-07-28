import { Game } from "@/types/game";

/**
 * All Nimia Games titles. Add new entries here to have them automatically
 * appear on the homepage preview, the /games listing, and get their own
 * /games/[slug] detail page + sitemap entry — no component changes needed.
 */
export const games: Game[] = [
  {
    slug: "lifetopia-world",
    name: "Lifetopia World",
    tagline: "Cozy Life Simulation",
    genre: "Life Simulation",
    status: "In Development",
    description:
      "A peaceful life simulation game where players can farm, fish, cook, craft, build, trade, and connect with others in a charming digital world.",
    longDescription:
      "Lifetopia World is Nimia Games' flagship title — a cozy life simulation set in a warm, hand-crafted digital world. Players grow their own homestead, fish and forage, cook and craft, build their dream space, and trade with a living community of other players. Ownership and trading are powered by the Solana ecosystem, letting players truly own the items, land, and creations they build over time, with the studio's long-term vision of expanding into other ecosystems as the world grows.",
    tags: ["Web", "Mobile", "Solana"],
    coverImage: "/games/lifetopia-preview.png",
    externalUrl: "https://lifetopiaworld.io",
    platforms: ["Web", "Android", "iOS"],
  },
];
