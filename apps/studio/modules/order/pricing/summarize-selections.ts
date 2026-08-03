import type { ConfigSelections, ServiceDefinition } from "../types";

export interface SelectionSummaryRow {
  label: string;
  value: string;
}

/** Human-readable "Field: chosen value" rows for EVERY configFields entry —
 * unlike calculateEstimate's lineItems (which only lists entries that
 * actually add cost), this is for Review's full configuration recap, where
 * a $0 choice like "Duration: 10 sec" still needs to be shown back to the
 * client for confirmation. */
export function summarizeSelections(
  service: ServiceDefinition | null,
  selections: ConfigSelections,
): SelectionSummaryRow[] {
  if (!service) return [];

  const rows: SelectionSummaryRow[] = [];
  for (const field of service.configFields) {
    if (field.type === "select") {
      const selectedId = (selections[field.id] as string | undefined) ?? field.defaultOptionId ?? field.options[0]?.id;
      const option = field.options.find((candidate) => candidate.id === selectedId);
      if (option) rows.push({ label: field.label, value: option.label });
    } else if (field.type === "toggle") {
      const isOn = (selections[field.id] as boolean | undefined) ?? field.defaultOn ?? false;
      rows.push({ label: field.label, value: isOn ? "Yes" : "No" });
    } else {
      const selectedIds = (selections[field.id] as string[] | undefined) ?? field.defaultSelectedIds ?? [];
      const labels = selectedIds
        .map((id) => field.options.find((option) => option.id === id)?.label)
        .filter((label): label is string => Boolean(label));
      rows.push({ label: field.label, value: labels.length > 0 ? labels.join(", ") : "None" });
    }
  }
  return rows;
}
