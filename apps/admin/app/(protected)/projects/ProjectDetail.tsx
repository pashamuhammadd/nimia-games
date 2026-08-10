"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, UploadCloud, Check } from "lucide-react";
import { Select, cn } from "@nimia/ui";
import { projectStatusMeta, PROJECT_STATUS_META, type ProjectStatus } from "../../lib/projectStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import {
  updateProjectStatusAction,
  updateProjectProgressAction,
  updateProjectDatesAction,
  getDeliverableUploadSignatureAction,
  addProjectDeliverableAction,
} from "./actions";
import type { ProjectRow } from "./ProjectsList";

// Real implementation (10 Agustus 2026) — the detail view opened from
// ProjectsList.tsx. Every write goes through ./actions.ts, which relies on
// projects_admin_write / project_files_admin_write (0006_rls_policies.sql)
// as the real security boundary, same convention as every other admin
// list+detail pair in this app.
export function ProjectDetail({ project }: { project: ProjectRow }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState(project.status);
  const [progress, setProgress] = React.useState(String(project.progress));
  const [startDate, setStartDate] = React.useState(project.startDate ?? "");
  const [deadline, setDeadline] = React.useState(project.deadline ?? "");
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const meta = projectStatusMeta(project.status);
  const sortedUpdates = [...project.updates].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const sig = await getDeliverableUploadSignatureAction(project.id);
        if (!sig.success) throw new Error(sig.error);

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
            // Cloudinary's error responses are normally JSON — don't let a
            // parse failure hide the real problem behind a generic crash.
          }
          throw new Error(`Couldn't upload ${file.name}: ${message}`);
        }
        const data = await response.json();

        const result = await addProjectDeliverableAction(project.id, file.name, data.secure_url as string);
        if (!result.success) throw new Error(result.error);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
          {project.clientLabel}
        </span>
        <h2 className="mt-1 text-lg font-bold text-white">{project.title}</h2>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
          <span className="text-xs font-medium text-white/55">{meta.label}</span>
          <span className="text-xs text-white/35">· {project.progress}% complete</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Status</label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="text-sm">
              {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((key) => (
                <option key={key} value={key}>
                  {PROJECT_STATUS_META[key].label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              disabled={isPending || status === project.status}
              onClick={() => run(() => updateProjectStatusAction(project.id, status))}
              className="shrink-0 rounded-md bg-[var(--nimia-crimson)] p-2 text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Progress (%)</label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <button
              type="button"
              disabled={isPending || Number(progress) === project.progress}
              onClick={() => run(() => updateProjectProgressAction(project.id, Number(progress)))}
              className="shrink-0 rounded-md bg-[var(--nimia-crimson)] p-2 text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/35">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={isPending || (startDate === (project.startDate ?? "") && deadline === (project.deadline ?? ""))}
        onClick={() => run(() => updateProjectDatesAction(project.id, startDate || null, deadline || null))}
        className="self-start rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
      >
        Save dates
      </button>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Timeline</span>
        {sortedUpdates.length > 0 ? (
          <ol className="mt-2 flex flex-col gap-3">
            {sortedUpdates.map((update, index) => (
              <li key={update.id} className="flex items-start gap-3">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nimia-pink)]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white/80">
                      {projectStatusMeta(update.toStatus).label}
                    </p>
                    <span className="shrink-0 text-xs text-white/35">
                      {formatRelativeTime(update.createdAt)}
                    </span>
                  </div>
                  {update.note ? <p className="mt-0.5 text-xs text-white/45">{update.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-white/40">No history yet.</p>
        )}
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Deliverables</span>
        {project.deliverables.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {project.deliverables.map((file) => (
              <a
                key={file.id}
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Download className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden="true" />
                  <span className="truncate">{file.fileName}</span>
                </span>
                <span className="shrink-0 text-xs text-white/35">{formatRelativeTime(file.createdAt)}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/40">Nothing uploaded yet.</p>
        )}

        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:bg-white/[0.03] hover:text-white/90">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={isUploading}
            className="sr-only"
            onChange={(event) => handleUpload(event.target.files)}
          />
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          {isUploading ? "Uploading..." : "Upload deliverable"}
        </label>
      </div>
    </div>
  );
}
