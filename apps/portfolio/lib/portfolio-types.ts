export type PortfolioFormat = "1:1" | "16:9" | "9:16" | "gif";
export type PortfolioResourceType = "image" | "video";
export type PortfolioSort = "latest" | "oldest" | "featured" | "az";

export interface PortfolioCategory {
  id: string;
  name: string;
  slug: string;
}

// Public-facing shape — deliberately NOT a 1:1 mirror of the `portfolio`
// table (spec §18: "Do not return unnecessary Cloudinary metadata to the
// client"). No cloudinary_public_id, no raw Cloudinary URLs, no
// cloudinary_metadata jsonb blob — only what the UI needs to render a card
// and a modal. See lib/portfolio-queries.ts's mapRowToPortfolioItem for the
// row -> this mapping.
export interface PortfolioItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: PortfolioCategory | null;
  client: string | null;
  project: string | null;
  year: number | null;
  durationSeconds: number | null;
  resourceType: PortfolioResourceType;
  format: PortfolioFormat | null;
  width: number | null;
  height: number | null;
  featured: boolean;
  tags: string[];
  /** Responsive thumbnail — always present (poster frame for video, the
   *  image itself for image/gif assets). */
  thumbnailSrc: string;
  thumbnailSrcSet: string;
  /** Larger derivative for the modal's non-video, non-gif image branch —
   *  thumbnailSrc alone (960w) would look soft blown up near-fullscreen. */
  fullImageSrc: string | null;
  /** Only set for resourceType "video" — points at this app's own
   *  /api/video/[slug] proxy, never a res.cloudinary.com URL. */
  videoSrc: string | null;
  /** Only set for resourceType "image" with format "gif" — full-resolution
   *  animated GIF passthrough (see lib/cloudinary-url.ts). */
  gifSrc: string | null;
  createdAt: string;
}

export interface PortfolioListResult {
  items: PortfolioItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PortfolioListParams {
  page?: number;
  limit?: number;
  category?: string; // category slug
  format?: PortfolioFormat;
  sort?: PortfolioSort;
  search?: string;
}
