"use client";

import * as React from "react";
import { Paperclip, Loader2, X } from "lucide-react";
import { cn } from "@nimia/ui";
import type { UploadedAsset } from "../types";
import { getCreativeAgentUploadSignatureAction } from "../state/get-creative-agent-upload-signature-action";
import { uploadFileToCloudinary } from "../state/upload-to-cloudinary";

export interface AttachFilesControlProps {
  uploadedAssets: UploadedAsset[];
  onFilesAttached: (files: UploadedAsset[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.pdf,.zip,.rar";

// Same 20 MB reasoning as modules/order/components/upload-section.tsx —
// comfortably covers reference images/PDFs/short clips without needing to
// know Nimia's exact Cloudinary plan limit up front.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Compact "attach a reference file" control for the Creative Agent
// composer (P5, 13 Agustus 2026) — deliberately much smaller than the
// order wizard's full-page UploadSection (brief §2: this is a consultant
// aside, not a form step). One paperclip button; picking files uploads
// them immediately (no "attach at submit time" staging step, unlike the
// order wizard, since there's no multi-step wizard here to stage within)
// straight to Cloudinary, then records the resulting URLs via the route
// handler. No remove-a-file affordance yet — once attached, it's attached
// for this chat; removal can be added later if it turns out to matter.
export function AttachFilesControl({ uploadedAssets, onFilesAttached, disabled }: AttachFilesControlProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const tooLarge = incoming.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);

    if (tooLarge.length > 0) {
      setError(
        `${tooLarge.map((file) => file.name).join(", ")} ${tooLarge.length > 1 ? "are" : "is"} over the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`,
      );
    } else {
      setError(null);
    }
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const sig = await getCreativeAgentUploadSignatureAction();
      if (!sig.success) {
        setError(sig.error);
        return;
      }
      const uploaded = await Promise.all(accepted.map((file) => uploadFileToCloudinary(file, sig)));

      const response = await fetch("/api/creative-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "attach_asset", files: uploaded }),
      });
      const data = await response.json();
      if (data.ok) {
        onFilesAttached(data.uploadedAssets as UploadedAsset[]);
      } else {
        setError(data.reason ?? "Couldn't save your attachment. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-[var(--nimia-border)] px-3 py-1.5 text-xs font-medium text-[var(--nimia-muted)] transition-colors duration-200 hover:border-[var(--nimia-gold-soft)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : "Attach a file"}
        </button>

        {uploadedAssets.map((file) => (
          <span
            key={file.url}
            className="max-w-[10rem] truncate rounded-full bg-[var(--nimia-gold-soft)] px-3 py-1.5 text-xs text-[var(--nimia-gold)]"
            title={file.name}
          >
            {file.name}
          </span>
        ))}
      </div>

      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
          <X className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
