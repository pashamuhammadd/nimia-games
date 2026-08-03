"use client";

import { Input, Textarea, Label } from "@nimia/ui";
import type { ProjectBrief } from "../types";

export interface ProjectBriefFormProps {
  brief: ProjectBrief;
  onChange: (patch: Partial<ProjectBrief>) => void;
}

// STEP 5 — plain, consistent form fields (reusing @nimia/ui's Input/
// Textarea/Label, same as every other form in the app) rather than
// anything configurator-specific — this step is closer to a normal form
// than Steps 1–4, which is fine, it's the brief's own content, not a
// choice to visualize as cards.
export function ProjectBriefForm({ brief, onChange }: ProjectBriefFormProps) {
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="targetPlatform">Target Platform</Label>
            <Input
              id="targetPlatform"
              value={brief.targetPlatform}
              onChange={(e) => onChange({ targetPlatform: e.target.value })}
              placeholder="e.g. iOS, Steam, Instagram"
            />
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={brief.deadline}
              onChange={(e) => onChange({ deadline: e.target.value })}
            />
          </div>
        </div>

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
