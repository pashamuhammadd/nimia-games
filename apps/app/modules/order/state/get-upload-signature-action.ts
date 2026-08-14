"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { cloudinary } from "../../../lib/cloudinary";

export type UploadSignatureResult =
  | {
      success: true;
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
    }
  | { success: false; error: string };

// Added 4 Agustus 2026 (P0.3 audit follow-up — "file upload order hilang
// total"). Returns a short-lived signed-upload payload so the BROWSER can
// POST file bytes directly to Cloudinary's REST API (see
// state/upload-to-cloudinary.ts), bypassing our own Next.js functions
// entirely for the actual file data. This matters because Vercel's
// serverless functions (both Route Handlers and Server Actions) cap
// request body size — routing a video/PDF/zip attachment through one of
// our own functions would silently fail or need extra config for every
// larger file. The Cloudinary API secret never leaves this server: only
// the one-way signature (a hash of the params below) is sent to the
// client, exactly like Cloudinary's own documented signed-upload flow.
export async function getUploadSignatureAction(): Promise<UploadSignatureResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return {
      success: false,
      error: "File uploads aren't available right now. You can still submit without attachments, or contact us directly.",
    };
  }

  // Defense in depth: useOrderWizard's submit() already redirects an
  // unauthenticated visitor to /login before this is ever called, so this
  // is a second check, not the primary gate.
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please sign in before attaching files." };
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Scoped per-user, NOT per-order — at the point files are uploaded, the
  // order doesn't exist yet (attachments upload before submitOrderAction
  // creates the row; the resulting URLs are attached to the real order via
  // `order_files` once it exists, see submit-order-action.ts). If an order
  // draft is abandoned after files are uploaded but before Submit is
  // clicked, the Cloudinary assets are simply orphaned under this user's
  // folder — acceptable for now; a cleanup job could sweep unattached
  // files later if it becomes worth doing (not a P0 concern).
  const folder = `orders/${user.id}`;
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  return {
    success: true,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}
