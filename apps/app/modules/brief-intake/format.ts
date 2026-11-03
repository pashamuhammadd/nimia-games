import { BUDGET_RANGES, PROJECT_TYPES, type BriefData, type ServiceLine } from "./schema";

// Pure helpers that turn a validated brief into the text stored on the
// order and shown to staff. Kept free of I/O so they are unit-tested.

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  animation: "Animation",
  development: "Development",
};

export function projectTypeLabel(serviceLine: ServiceLine, projectType: string): string {
  const match = (PROJECT_TYPES[serviceLine] as readonly { id: string; label: string }[]).find((t) => t.id === projectType);
  return match?.label ?? "Something else";
}

export function budgetLabel(budgetId: string): string {
  return BUDGET_RANGES.find((b) => b.id === budgetId)?.label ?? "Not sure yet";
}

export function formatOrderCode(orderId: string): string {
  return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
}

/** orders.package_name is already the display label every list, receipt,
 * email and Discord message falls back to when service_id is null (Custom
 * Order and Creative Agent use it the same way), so brief orders render
 * everywhere without changing those read sites. */
export function buildBriefDisplayName(brief: Pick<BriefData, "serviceLine" | "title">): string {
  return `${SERVICE_LINE_LABELS[brief.serviceLine]} brief: ${brief.title.trim()}`.slice(0, 160);
}

export function buildBriefBudgetText(budgetId: string): string {
  return `${budgetLabel(budgetId)} (client's starting budget, not a final price)`;
}

export function buildBriefDescription(brief: BriefData): string {
  const lines = [
    `Service: ${SERVICE_LINE_LABELS[brief.serviceLine]} — ${projectTypeLabel(brief.serviceLine, brief.projectType)}`,
    `Project: ${brief.title.trim()}`,
    "",
    brief.description.trim(),
  ];
  return lines.join("\n");
}

/** Telegram is a help channel next to the order, never a replacement for
 * it. The prefilled text carries only the order code and the project
 * name: no budget, contact details or brief contents, and the order code
 * alone grants no access to anything (orders are RLS-protected). */
export function buildTelegramHelpUrl(
  rawBaseUrl: string | undefined | null,
  orderCode: string,
  serviceLine: ServiceLine,
  title: string,
): string | null {
  if (!rawBaseUrl) return null;
  let base: URL;
  try {
    base = new URL(rawBaseUrl.trim());
  } catch {
    return null;
  }
  const isTelegramHost = base.hostname === "t.me" || base.hostname === "telegram.me";
  const username = base.pathname.replace(/^\/+|\/+$/g, "");
  if (base.protocol !== "https:" || !isTelegramHost || !/^[A-Za-z0-9_]{4,32}$/.test(username)) {
    return null;
  }
  const shortTitle = title.trim().slice(0, 60);
  const text = `Hi Nimia Studio, I just sent order ${orderCode} (${SERVICE_LINE_LABELS[serviceLine]}: ${shortTitle}). I'd like to talk through the details.`;
  return `https://t.me/${username}?text=${encodeURIComponent(text)}`;
}
