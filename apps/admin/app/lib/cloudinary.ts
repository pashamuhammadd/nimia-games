import { v2 as cloudinary } from "cloudinary";

// Mirrors apps/studio/lib/cloudinary.ts exactly (10 Agustus 2026, added for
// Deliverables upload on the Projects page). Server-only config: the SDK
// is only used here to mint a signed upload payload (see
// app/(protected)/projects/actions.ts's getDeliverableUploadSignatureAction)
// — the browser then POSTs file bytes directly to Cloudinary's REST API
// with that signature, never through this SDK/this server. Same reasoning
// as studio's copy: Vercel serverless functions cap request body size, so
// routing deliverable file bytes through one of our own functions would be
// fragile for anything beyond a small file.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
