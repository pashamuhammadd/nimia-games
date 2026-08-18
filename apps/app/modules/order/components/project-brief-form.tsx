"use client";

import { Input, Textarea, Label } from "@nimia/ui";
import type { ProjectBrief } from "../types";

export interface ProjectBriefFormProps {
  brief: ProjectBrief;
  onChange: (patch: Partial<ProjectBrief>) => void;
  /** Animation Validation (16 Agustus 2026, Fase 5 — see
   * FASE0-AUDIT.md section E). When true (the order resolves to the
   * "animation" category, see useOrderWizard's isAnimationOrder), this
   * form additionally renders a required Script/Story textarea. Defaults
   * to false so every other category's brief step is unchanged. */
  isAnimationOrder?: boolean;
}

// STEP — plain, consistent form fields (reusing @nimia/ui's Input/
// Textarea/Label, same as every other form in the app) rather than
// anything configurator-specific — this step is closer to a normal form
// than the catalog steps, which is fine, it's the brief's own content,
// not a choice to visualize as cards.
//
// Deadline field REMOVED (18 Agustus 2026, per user request) — the
// client no longer types a delivery date by hand; it's auto-computed from
// the order's own delivery estimate (see useOrderWizard's
// estimatedDeliveryDate and ../pricing/estimate-deadline.ts) and shown
// read-only on the Review step instead. One fewer required field here, on
// top of Upload Files now rendering alongside this form under the same
// "brief" step (see components/order-wizard.tsx) instead of its own
// separate step.
export function ProjectBriefForm({ brief, onChange, isAnimationOrder = false }: ProjectBriefFormProps) {
  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Tell us about your project
      </h2>
      <p className="mt-2 text-white/55">A short brief helps our team understand your vision.</p>

      <div className="mt-8 flex flex-col gap-5">
        <div>
          <Label htmlFor="projectTitle">Project Title</Label>
          <Input
            id="projectTitle"
            value={brief.projectTitle}
            onChange={(e) => onChange({ projectTitle: e.target.value })}
            placeholder="e.g. Lemmirun Launch Trailer"
            required
          />
        </div>

        <div>
          <Label htmlFor="projectDescription">Project Description</Label>
          <Textarea
            id="projectDescription"
            rows={5}
            value={brief.projectDescription}
            onChange={(e) => onChange({ projectDescription: e.target.value })}
            placeholder="Describe your project, goals, and any must-haves."
            required
          />
        </div>

        <div>
          <Label htmlFor="targetPlatform">Target Platform</Label>
          <Input
            id="targetPlatform"
            value={brief.targetPlatform}
            onChange={(e) => onChange({ targetPlatform: e.target.value })}
            placeholder="e.g. iOS, Steam, Instagram"
          />
        </div>

        {isAnimationOrder ? (
          <div>
            <Label htmlFor="script">Script / Story *</Label>
            <Textarea
              id="script"
              rows={6}
              value={brief.script}
              onChange={(e) => onChange({ script: e.target.value })}
              placeholder="Paste your script, storyline, or shot-by-shot breakdown."
              required
            />
            <p className="mt-1.5 text-xs text-white/40">
              Required for Animation projects — this is what our animators work from.
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="referenceLink">Reference Link</Label>
          <Input
            id="referenceLink"
            type="url"
            value={brief.referenceLink}
            onChange={(e) => onChange({ referenceLink: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label htmlFor="additionalNotes">Additional Notes</Label>
          <Textarea
            id="additionalNotes"
            rows={3}
            value={brief.additionalNotes}
            onChange={(e) => onChange({ additionalNotes: e.target.value })}
            placeholder="Anything else our team should know?"
          />
        </div>
      </div>
    </div>
  );
}
