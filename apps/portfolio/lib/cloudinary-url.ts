// Cloudinary delivery URL builder — no SDK involved, just string
// templates. Every URL built here is a PUBLIC, cacheable, already-optimized
// derived image (f_auto/q_auto/w_*, per spec §21) — this is deliberately
// NOT the same trust boundary as the actual video source (see
// app/api/video/[id]/route.ts): a thumbnail/poster is meant to be directly
// fetchable by browsers, CDNs, and social/search crawlers (OG images,
// Google Images), so there's nothing to hide behind our own origin here.
//
// Only ever call these on the server (route handlers / server components)
// — CLOUDINARY_CLOUD_NAME is a server env var (not NEXT_PUBLIC_*) on
// purpose, so the cloud name still isn't hardcoded/guessable from a
// checked-in NEXT_PUBLIC_ value, even though the resulting URLs are
// public. Server components resolve the final URL string and pass THAT
// down as a prop; client components never import this file.
function cloudName(): string {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  if (!name) {
    throw new Error("CLOUDINARY_CLOUD_NAME is not configured");
  }
  return name;
}

type CloudinaryResourceType = "image" | "video";

function baseDeliveryUrl(resourceType: CloudinaryResourceType): string {
  return `https://res.cloudinary.com/${cloudName()}/${resourceType}/upload`;
}

// Widths used to build a responsive `srcSet` for grid/card thumbnails.
// Deliberately plain <img srcSet> rather than next/image (spec §21): next/
// image would re-encode an ALREADY f_auto/q_auto-optimized Cloudinary
// derivative through Vercel's own image optimizer, paying for and
// re-running work Cloudinary already did. dpr_auto below covers retina
// without needing separate 2x/3x URL variants.
export const THUMBNAIL_WIDTHS = [400, 640, 960, 1280, 1600] as const;

// A still-frame thumbnail for either an image asset OR a video's poster
// frame (so_0 = frame at 0 seconds, re-delivered as .jpg) — same technique
// as apps/studio's existing app/api/video/[id]/sources.ts, generalized here
// for any public_id/resourceType pulled from the `portfolio` table instead
// of a hardcoded lookup.
export function buildThumbnailUrl(
  publicId: string,
  resourceType: CloudinaryResourceType,
  width: number,
): string {
  const transforms = ["f_auto", "q_auto", `w_${width}`, "dpr_auto"];
  if (resourceType === "video") {
    return `${baseDeliveryUrl("video")}/so_0,${transforms.join(",")}/${publicId}.jpg`;
  }
  return `${baseDeliveryUrl("image")}/${transforms.join(",")}/${publicId}`;
}

export function buildThumbnailSrcSet(
  publicId: string,
  resourceType: CloudinaryResourceType,
  widths: readonly number[] = THUMBNAIL_WIDTHS,
): string {
  return widths.map((w) => `${buildThumbnailUrl(publicId, resourceType, w)} ${w}w`).join(", ");
}

// Reasonable default `src` for browsers/crawlers that ignore srcset
// entirely (also used as the Open Graph / Twitter card image, §28).
export function buildThumbnailFallback(publicId: string, resourceType: CloudinaryResourceType): string {
  return buildThumbnailUrl(publicId, resourceType, 960);
}

// Full-resolution GIF passthrough for the modal (GIFs are small/looping by
// nature — no benefit to the video-proxy treatment below, and browsers
// need the actual .gif bytes to animate it, not a still frame).
export function buildAnimatedGifUrl(publicId: string): string {
  return `${baseDeliveryUrl("image")}/f_auto,q_auto/${publicId}.gif`;
}

// Optimized MP4 delivery URL for the actual playable video — ONLY ever
// called from app/api/video/[id]/route.ts (server-side), never returned
// directly to a client component. See that route's header comment for the
// full security rationale (same posture apps/studio already ships).
export function buildVideoSourceUrl(publicId: string): string {
  return `${baseDeliveryUrl("video")}/f_auto,q_auto/${publicId}.mp4`;
}
