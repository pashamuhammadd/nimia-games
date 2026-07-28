import { GalleryItem } from "@/types/gallery";

export const galleryItems: GalleryItem[] = [
  { src: "/gallery/animation-1.mp4", category: "Motion", alt: "Motion graphics reel 1" },
  { src: "/gallery/animation-2.mp4", category: "Character", alt: "Character animation reel" },
  { src: "/gallery/animation-3.mp4", category: "Game Trailer", alt: "Game trailer cut" },
  { src: "/gallery/animation-4.mp4", category: "Solana", alt: "Solana ecosystem showcase" },
  { src: "/gallery/animation-5.mp4", category: "Motion", alt: "Motion graphics reel 2" },
  { src: "/gallery/animation-6.mp4", category: "Character", alt: "Character animation loop" },
];

export const galleryCategories = [
  "All",
  "Character",
  "Motion",
  "Game Trailer",
  "Solana",
] as const;
