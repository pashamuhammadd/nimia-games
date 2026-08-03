import type { ConfigSelections, ServiceDefinition } from "../types";

/** Builds the default configSelections for a freshly-chosen service, reading
 * each field's own declared default (or the field type's natural fallback)
 * — never hardcoded per service. */
export function getDefaultSelections(service: ServiceDefinition | null): ConfigSelections {
  if (!service) return {};

  const selections: ConfigSelections = {};
  for (const field of service.configFields) {
    if (field.type === "select") {
      selections[field.id] = field.defaultOptionId ?? field.options[0]?.id ?? "";
    } else if (field.type === "toggle") {
      selections[field.id] = field.defaultOn ?? false;
    } else {
      selections[field.id] = field.defaultSelectedIds ?? [];
    }
  }
  return selections;
}
