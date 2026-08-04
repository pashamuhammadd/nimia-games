import { v2 as cloudinary } from "cloudinary";

// Added 4 Agustus 2026 (P0.3 — "file upload order hilang total" dari
// audit). Server-only config: the SDK is only used here to mint a signed
// upload payload (see modules/order/state/get-upload-signature-action.ts)
// — the browser then POSTs file bytes directly to Cloudinary's REST API
// with that signature, never through this SDK/this server. That's why
// there's no `cloudinary.uploader.upload(...)` call anywhere in this repo:
// the actual upload never touches our Next.js functions.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
