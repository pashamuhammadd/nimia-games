import type { CategoryDefinition, ServiceDefinition } from "../types";
import { ANIMATION_CATEGORY } from "./categories/animation";
import { DIGITAL_ASSETS_CATEGORY } from "./categories/digital-assets";
import { WEBSITE_DEVELOPMENT_CATEGORY } from "./categories/website-development";
import { GAME_DEVELOPMENT_CATEGORY } from "./categories/game-development";

// Single source of truth for the whole /order configurator (Steps 1–4).
// Order here is display order for Step 1's category cards.
export const ORDER_CATALOG: CategoryDefinition[] = [
  ANIMATION_CATEGORY,
  DIGITAL_ASSETS_CATEGORY,
  WEBSITE_DEVELOPMENT_CATEGORY,
  GAME_DEVELOPMENT_CATEGORY,
];

export function getCategory(categoryId: string | null): CategoryDefinition | null {
  if (!categoryId) return null;
  return ORDER_CATALOG.find((category) => category.id === categoryId) ?? null;
}

export function getService(
  categoryId: string | null,
  serviceId: string | null,
): ServiceDefinition | null {
  const category = getCategory(categoryId);
  if (!category || !serviceId) return null;
  return category.services.find((service) => service.id === serviceId) ?? null;
}

/** Looks a service up by id alone (no category needed) — used to restore a
 * wizard session from localStorage where only ids were persisted. */
export function findServiceById(serviceId: string | null): ServiceDefinition | null {
  if (!serviceId) return null;
  for (const category of ORDER_CATALOG) {
    const found = category.services.find((service) => service.id === serviceId);
    if (found) return found;
  }
  return null;
}
