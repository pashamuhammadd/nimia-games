"use client";

import * as React from "react";
import { Search, Download, Gift } from "lucide-react";
import { formatRelativeTime } from "../../lib/relativeTime";

export type DeliveryFileRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
};

export type DeliveryProjectGroup = {
  projectId: string;
  projectTitle: string;
  files: DeliveryFileRow[];
};

export function DeliveriesList({ groups }: { groups: DeliveryProjectGroup[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        files: group.projectTitle.toLowerCase().includes(q)
          ? group.files
          : group.files.filter((file) => file.fileName.toLowerCase().includes(q)),
      }))
      .filter((group) => group.files.length > 0);
  }, [groups, query]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
        <Gift className="h-8 w-8 text-white/25" aria-hidden="true" />
        <p className="max-w-sm text-sm text-white/50">
          Nothing here yet. Once the Nimia Games team uploads a finished file for one of your
          projects, it&apos;ll show up here to download.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by project or file name..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-5">
        {filtered.map((group) => (
          <div key={group.projectId} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-white/70">{group.projectTitle}</h3>
            <div className="flex flex-col gap-2">
              {group.files.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.14]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Download className="h-4 w-4 text-[var(--nimia-pink)]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{file.fileName}</span>
                      <span className="block text-xs text-white/40">
                        Delivered {formatRelativeTime(file.createdAt)}
                      </span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
          No files match &ldquo;{query}&rdquo;.
        </div>
      ) : null}
    </div>
  );
}
