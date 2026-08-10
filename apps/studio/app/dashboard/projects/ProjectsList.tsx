"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { Modal, cn } from "@nimia/ui";
import { projectStatusMeta } from "../../lib/projectStatus";
import { formatRelativeTime } from "../../lib/relativeTime";

// Real implementation (10 Agustus 2026) — replaces the "Coming in Phase 5"
// placeholder. Read-only for the client (projects_select_own_or_admin,
// packages/db/migrations/0006_rls_policies.sql, only allows SELECT) —
// status/progress are set by the studio team from apps/admin's own
// Projects page.
export type ProjectUpdateRow = {
  id: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

export type ProjectRow = {
  id: string;
  title: string;
  status: string;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
  updates: ProjectUpdateRow[];
};

export function ProjectsList({ projects }: { projects: ProjectRow[] }) {
  const [selected, setSelected] = React.useState<ProjectRow | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        {projects.map((project, index) => {
          const meta = projectStatusMeta(project.status);
          return (
            <motion.button
              key={project.id}
              type="button"
              onClick={() => setSelected(project)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className="flex w-full flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left transition-colors hover:border-white/[0.14]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{project.title}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
                  {meta.label}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                />
              </div>
              <p className="text-xs text-white/35">
                {project.progress}% complete · Started {formatRelativeTime(project.createdAt)}
                {project.deadline ? ` · Deadline ${project.deadline}` : ""}
              </p>
            </motion.button>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} ariaLabel="Project detail" className="max-w-lg nimia-dark-vars">
        {selected ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-white">{selected.title}</h2>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", projectStatusMeta(selected.status).dotClass)}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-white/55">
                  {projectStatusMeta(selected.status).label}
                </span>
                <span className="text-xs text-white/35">· {selected.progress}% complete</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, selected.progress))}%` }}
                />
              </div>
            </div>

            {selected.startDate || selected.deadline ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.startDate ? (
                  <div>
                    <p className="text-xs text-white/35">Start Date</p>
                    <p className="mt-0.5 text-white/80">{selected.startDate}</p>
                  </div>
                ) : null}
                {selected.deadline ? (
                  <div>
                    <p className="text-xs text-white/35">Deadline</p>
                    <p className="mt-0.5 text-white/80">{selected.deadline}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Timeline</span>
              {selected.updates.length > 0 ? (
                <ol className="mt-2 flex flex-col gap-3">
                  {[...selected.updates]
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                    .map((update) => (
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

            <Link
              href="/dashboard/deliveries"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              View Deliverables
            </Link>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
