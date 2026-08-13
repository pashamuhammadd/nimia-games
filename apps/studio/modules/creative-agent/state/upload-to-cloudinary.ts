export type CloudinaryUploadResult = { name: string; url: string };

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

// Deliberately a near-duplicate of modules/order/state/upload-to-
// cloudinary.ts rather than an import from that module (13 Agustus 2026,
// P5). The two modules are meant to stay independent — modules/order
// doesn't export this from its barrel, and reaching into another module's
// state/ internals to save ~25 lines would create exactly the kind of
// cross-module coupling this codebase's module boundaries (see modules/
// creative-agent/index.ts's own barrel comment) are trying to avoid. Not
// a "use server" file: runs client-side, called from
// AttachFilesControl.tsx once per attached file, same as the order
// wizard's use.
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
