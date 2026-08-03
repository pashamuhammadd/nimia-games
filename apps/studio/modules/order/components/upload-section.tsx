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
}

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.pdf,.zip,.rar";

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

// STEP 6 — local-state only for now (per the brief: "Cloudinary belum
// perlu. Gunakan local state terlebih dahulu."). File objects live only in
// useOrderWizard's in-memory fileBlobs map, never in localStorage, so a
// real navigation (e.g. the unauthenticated Submit -> /login redirect)
// clears them — the note below makes that limitation visible rather than
// silently losing attachments.
export function UploadSection({ files, onAddFiles, onRemoveFile }: UploadSectionProps) {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onAddFiles(Array.from(fileList));
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Upload reference files
      </h2>
      <p className="mt-2 text-white/55">
        Share references, briefs, or existing assets: images, video, audio, PDF, or ZIP.
      </p>

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
          accept={ACCEPTED_TYPES}
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
        <p className="text-xs text-white/40">Images, video, audio, PDF, ZIP: any number of files</p>
      </label>

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
        Note: attached files stay on this page only. If you're redirected to log in before
        submitting, please re-attach them once you're back.
      </p>
    </div>
  );
}
