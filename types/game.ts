export type GameStatus = "In Development" | "Alpha" | "Beta" | "Released";

export interface Game {
  /** URL-safe identifier, used for /games/[slug] */
  slug: string;
  name: string;
  tagline: string;
  genre: string;
  status: GameStatus;
  /** Short description used on cards / previews */
  description: string;
  /** Longer description used on the dedicated game detail page */
  longDescription: string;
  tags: string[];
  coverImage: string;
  externalUrl?: string;
  platforms: string[];
}
