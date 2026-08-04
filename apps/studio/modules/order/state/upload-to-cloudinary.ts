export type CloudinaryUploadResult = { name: string; url: string };

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

// Added 4 Agustus 2026 (P0.3 audit follow-up). Posts a file directly to
// Cloudinary's REST API from the browser using a signature minted by
// getUploadSignatureAction — see that file's comment for why the upload
// bypasses our own server entirely. Deliberately NOT a "use server" file:
// this runs client-side, inside useOrderWizard's submit() (state/
// use-order-wizard.ts), once per attached file.
//
// `/auto/upload` lets Cloudinary infer resource_type per file — images and
// video get their normal type, everything else (pdf, zip, rar — see
// upload-section.tsx's ACCEPTED_TYPES) falls back to "raw" automatically,
// so one endpoint covers every file type the order form accepts.
export async function uploadFileToCloudinary(
  file: File,
  sig: CloudinarySignature,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Upload failed. Please try again.";
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Cloudinary's error responses are normally JSON, but don't let a
      // parse failure here hide the real problem behind a generic crash.
    }
    throw new Error(`Couldn't upload ${file.name}: ${message}`);
  }

  const data = await response.json();
  return { name: file.name, url: data.secure_url as string };
}
