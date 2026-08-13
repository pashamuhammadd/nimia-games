import type { StructuredProjectData } from "../types";

// Shared between UnderstandingPreviewCard (pre-confirm "is this right?"
// step) and CreativeBriefCard (post-confirm final view, P6) so the two
// never drift on field order/labels — extracted 13 Agustus 2026 when
// CreativeBriefCard was added, out of what was originally just
// UnderstandingPreviewCard's own local constant.
export const STRUCTURED_DATA_FIELD_LABELS: { key: keyof StructuredProjectData; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "projectType", label: "Project Type" },
  { key: "duration", label: "Duration" },
  { key: "concept", label: "Concept" },
  { key: "style", label: "Visual Direction" },
  { key: "characters", label: "Characters" },
  { key: "platform", label: "Platform" },
  { key: "deliverables", label: "Deliverables" },
  { key: "sound", label: "Sound" },
  { key: "references", label: "References" },
  { key: "deadline", label: "Deadline" },
  { key: "budget", label: "Budget" },
  { key: "complexity", label: "Complexity" },
  { key: "objective", label: "Objective" },
];

// Typed `unknown` rather than StructuredProjectData[keyof StructuredProjectData]
// on purpose — that indexed-access union is awkward for TS to narrow
// cleanly through the Array.isArray check below, and every call site here
// only ever passes one field's value, so the extra precision buys nothing.
export function formatStructuredDataValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : null;
  if (typeof value !== "string") return null;
  return value;
}

/** Every non-null field, labeled and formatted — the one list both cards
 * render, so "what counts as a field worth showing" is defined exactly
 * once. */
export function structuredDataRows(understanding: StructuredProjectData): { label: string; value: string }[] {
  return STRUCTURED_DATA_FIELD_LABELS.map(({ key, label }) => ({
    label,
    value: formatStructuredDataValue(understanding[key]),
  })).filter((row): row is { label: string; value: string } => row.value !== null);
}
