import { v2 as cloudinary } from "cloudinary";

// Server-only Cloudinary SDK config. Mirrors apps/studio/modules/creative-agent's
// and apps/admin/app/lib/cloudinary.ts's identical pattern exactly (same 3
// env vars, same duplication-over-coupling rationale — see either of those
// files' own header comments). Used here for two things only:
//   1. app/api/cloudinary/webhook/route.ts — verifying the inbound webhook
//      signature (needs CLOUDINARY_API_SECRET).
//   2. Nothing else signs or uploads from this app — apps/portfolio is a
//      READ-only consumer of whatever's already in Cloudinary/the
//      `portfolio` table. Uploading/tagging assets happens in Cloudinary
//      itself (or via apps/admin later, if a direct-upload flow is ever
//      added there) — never from the public gallery.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
