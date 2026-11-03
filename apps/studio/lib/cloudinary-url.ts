// Public Cloudinary still-image URLs for portfolio thumbnails on the studio
// homepage. Same transform recipe as apps/portfolio/lib/cloudinary-url.ts
// (f_auto/q_auto/w_*/dpr_auto, so_0 poster frame for videos). Kept as a
// small local copy because apps cannot import each other's lib/ folders;
// move both into a shared package if a third caller appears.
//
// Server-only: CLOUDINARY_CLOUD_NAME is a server env var. Server components
// resolve the final URL strings and pass them down as props.

export type CloudinaryResourceType = "image" | "video";

export const THUMBNAIL_WIDTHS = [400, 640, 960, 1280] as const;

export function buildThumbnailUrl(
  cloudName: string,
  publicId: string,
  resourceType: CloudinaryResourceType,
  width: number,
): string {
  const transforms = ["f_auto", "q_auto", `w_${width}`, "dpr_auto"].join(",");
  const base = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload`;
  return resourceType === "video"
    ? `${base}/so_0,${transforms}/${publicId}.jpg`
    : `${base}/${transforms}/${publicId}`;
}

export function buildThumbnailSrcSet(
  cloudName: string,
  publicId: string,
  resourceType: CloudinaryResourceType,
  widths: readonly number[] = THUMBNAIL_WIDTHS,
): string {
  return widths
    .map((width) => `${buildThumbnailUrl(cloudName, publicId, resourceType, width)} ${width}w`)
    .join(", ");
}
