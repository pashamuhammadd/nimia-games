export type GalleryCategory =
  | "Character"
  | "Motion"
  | "Game Trailer"
  | "Solana";

export interface GalleryItem {
  src: string;
  category: GalleryCategory;
  alt: string;
}
