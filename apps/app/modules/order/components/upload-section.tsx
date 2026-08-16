"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Image as ImageIcon, Film, Music, FileArchive, X } from "lucide-react";
import { cn } from "@nimia/ui";
import type { UploadedFileMeta } from "../types";

export interface UploadSectionProps {
  files: UploadedFileMeta[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  /** Animation Validation (16 Agustus 2026, Fase 5) — every prop below is
   * optional and defaults to this component's original generic-attachments
   * copy/behavior, so every existing caller (the one "Upload reference
   * files" zone each order type already had) is unaffected. They exist so
   * order-wizard.tsx can render a SECOND instance of this same component —
   * the Animation-only "Character Reference Images" zone — without
   * duplicating the drag/drop/list/remove logic above. */
  title?: string;
  subtitle?: string;
  accept?: string;
  helperText?: string;
  /** Shown under the heading when this zone is required but still empty
   * (e.g. "At least one image is required for Animation orders."). Purely
   * a UX nudge — the real gate is canGoNext's "upload" step branch and
   * submit-order-action.ts's server-side re-validation. */
  requiredHint?: string;
}

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.pdf,.zip,.rar";
const DEFAULT_TITLE = "Upload reference files";
const DEFAULT_SUBTITLE = "Share references, briefs, or existing assets: images, video, audio, PDF, or ZIP.";

// Added 4 Agustus 2026 (P0.3) — a client-side guard so an oversized file is
// rejected immediately with a clear reason, instead of only failing later
// at Submit once useOrderWizard actually tries to upload it to Cloudinary.
// 20 MB comfortably covers reference images/PDFs/short clips; adjust to
// match whatever Nimia's actual Cloudinary plan allows if that changes.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForType(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;
  if (type === "application/pdf") return FileText;
  if (type.includes("zip") || type.includes("rar")) return FileArchive;
  return FileText;
}

// STEP 6 — file picking still only touches local state here (the File
// objects live in useOrderWizard's in-memory fileBlobs map, never in
// localStorage — Files aren't JSON-serializable, and aren't meant to
// survive a real navigation like the login redirect anyway). What changed
// 4 Agustus 2026 (P0.3): these files are no longer discarded at submit
// time — useOrderWizard's submit() now actually uploads each one to
// Cloudinary right before creating the order (see
// state/upload-to-cloudinary.ts), so nothing is lost once the order goes
// through. The redirect caveat below is a separate, still-true limitation:
// a real page navigation (e.g. the unauthenticated Submit -> /login
// redirect) still clears in-memory File blobs, same as before.
export function UploadSection({
  files,
  onAddFiles,
  onRemoveFile,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  accept = ACCEPTED_TYPES,
  helperText,
  requiredHint,
}: UploadSectionProps) {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [sizeError, setSizeError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const tooLarge = incoming.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);

    setSizeError(
      tooLarge.length > 0
        ? `${tooLarge.map((file) => file.name).join(", ")} ${tooLarge.length > 1 ? "are" : "is"} over the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit and ${tooLarge.length > 1 ? "weren't" : "wasn't"} added.`
        : null,
    );

    if (accepted.length > 0) onAddFiles(accepted);
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-white/55">
        {subtitle}
      </p>
      {requiredHint && files.length === 0 ? (
        <p className="mt-2 text-sm font-medium text-amber-400">{requiredHint}</p>
      ) : null}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors duration-150",
          isDraggingOver
            ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <UploadCloud className="h-8 w-8 text-white/40" aria-hidden="true" />
        <p className="text-sm font-semibold text-white">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-white/40">
          {helperText ?? `Images, video, audio, PDF, ZIP — up to ${formatBytes(MAX_FILE_SIZE_BYTES)} each`}
        </p>
      </label>

      {sizeError ? <p className="mt-3 text-sm text-red-400">{sizeError}</p> : null}

      {files.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2.5">
          {files.map((file) => {
            const Icon = iconForType(file.type);
            return (
              <motion.li
                key={file.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <Icon className="h-4 w-4 text-[var(--nimia-pink)]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{file.name}</span>
                  <span className="block text-xs text-white/40">{formatBytes(file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-4 text-xs text-white/35">
        Note: files upload when you submit your order, so nothing is sent until then. If you're
        redirected to log in before submitting, please re-attach them once you're back.
      </p>
    </div>
  );
}
