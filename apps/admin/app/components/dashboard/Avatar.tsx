import { UserRound } from "lucide-react";
import { cn } from "@nimia/ui";

// Parity fix (11 Agustus 2026, user report: "foto profil klien/admin
// harus sama kayak di studio.nimiagames.com dong tampilannya jangan pake
// huruf") — mirrors apps/studio/app/components/dashboard/Avatar.tsx
// EXACTLY (same default gradient + person-silhouette look, same
// prefer-a-real-photo-once-one-exists behavior). apps/admin never had
// this component: its Topbar/ClientsList showed a plain uppercase letter
// (Topbar) or two-letter initials on a colored square (ClientsList)
// instead of ever reading `users.avatar_url`. There's no shared package
// apps/admin and apps/studio can both import a component from (separate
// Next.js apps in the monorepo, same gap this codebase already accepts
// elsewhere — see e.g. apps/admin/app/(protected)/partners/partner-level.ts's
// own comment) — kept as an exact duplicate rather than adding one.
export function Avatar({
  avatarUrl,
  name,
  size = "sm",
}: {
  avatarUrl?: string | null;
  name?: string;
  size?: "sm" | "md";
}) {
  const dimensionClass = size === "md" ? "h-16 w-16" : "h-8 w-8";
  const iconClass = size === "md" ? "h-8 w-8" : "h-4 w-4";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a user-uploaded
      // photo is an arbitrary remote URL, not a fixed local asset next/image
      // can meaningfully optimize here.
      <img
        src={avatarUrl}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={cn(dimensionClass, "shrink-0 rounded-full object-cover")}
      />
    );
  }

  return (
    <span
      className={cn(
        dimensionClass,
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
      )}
      aria-hidden="true"
    >
      <UserRound className={cn(iconClass, "text-white/90")} strokeWidth={1.75} />
    </span>
  );
}
