// Lightweight "2 hours ago" / "Yesterday" formatting for the dashboard's
// Recent Activity timeline and Active Orders "Updated ..." captions (30
// Juli 2026). Deliberately hand-rolled instead of adding a date library —
// this is the only place in apps/studio that needs relative time so far.
export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffDay < 30) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
