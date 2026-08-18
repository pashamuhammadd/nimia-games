"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Modal, cn } from "@nimia/ui";
import { projectStatusMeta } from "../../lib/projectStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import { ProjectDetail } from "./ProjectDetail";

export type ProjectUpdateRow = {
  id: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

export type ProjectFileRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
};

export type ProjectRow = {
  id: string;
  title: string;
  clientLabel: string;
  status: string;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
  updates: ProjectUpdateRow[];
  deliverables: ProjectFileRow[];
};

const THUMBNAIL_GRADIENTS = [
  "from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
  "from-purple-500 to-[var(--nimia-crimson)]",
  "from-sky-500 to-purple-500",
  "from-amber-500 to-[var(--nimia-crimson)]",
];

function thumbnailGradient(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THUMBNAIL_GRADIENTS[hash % THUMBNAIL_GRADIENTS.length];
}

function initialsFor(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

export function ProjectsList({
  projects,
  initialQuery = "",
}: {
  projects: ProjectRow[];
  // 18 Agustus 2026, Fase 13 click-test bugfix — pre-fills the search box
  // when arriving from OrderDetailPanel's "Manage Production" link
  // (page.tsx reads the `?q=` param and passes it through here), so admin
  // doesn't land on an unfiltered list after clicking through from an
  // order. Purely a starting value — the user can still clear/change it
  // like any normal search input.
  initialQuery?: string;
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [selected, setSelected] = React.useState<ProjectRow | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.title.toLowerCase().includes(q) || p.clientLabel.toLowerCase().includes(q),
    );
  }, [projects, query]);

  // Once opened, the Modal shows a snapshot of `selected` — keep it in
  // sync with the freshly server-refetched `projects` prop after an
  // action's router.refresh() (see ProjectDetail.tsx's `run`), otherwise
  // the open modal would keep showing pre-update values until closed.
  React.useEffect(() => {
    if (!selected) return;
    const fresh = projects.find((p) => p.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [projects, selected]);

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No projects yet — one is created automatically the moment an order is paid.
      </div>
    );
  }

  return (
    <>
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
            placeholder="Search by project or client..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((project) => {
            const meta = projectStatusMeta(project.status);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelected(project)}
                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${thumbnailGradient(project.clientLabel)}`}
                  aria-hidden="true"
                >
                  {initialsFor(project.clientLabel)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{project.title}</p>
                    <span className="shrink-0 text-xs text-white/35">
                      {formatRelativeTime(project.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/45">{project.clientLabel}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
                    <span className="text-xs font-medium text-white/50">{meta.label}</span>
                    <span className="text-xs text-white/35">· {project.progress}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
            No projects match &ldquo;{query}&rdquo;.
          </div>
        ) : null}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} ariaLabel="Project detail" className="max-w-lg">
        {selected ? <ProjectDetail project={selected} /> : null}
      </Modal>
    </>
  );
}
