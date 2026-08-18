// Small, admin-only thumbnail URL builder — same technique as
// apps/portfolio/lib/cloudinary-url.ts (so_0 poster frame for video,
// f_auto/q_auto/w_ for images), sized down for this page's compact list
// rows rather than the public gallery's larger cards.
export function buildAdminThumbnailUrl(publicId: string, resourceType: "image" | "video"): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !publicId) return "";
  const transforms = "f_auto,q_auto,w_160,dpr_auto";
  if (resourceType === "video") {
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,${transforms}/${publicId}.jpg`;
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}
