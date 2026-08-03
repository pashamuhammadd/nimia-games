import { UserRound } from "lucide-react";
import { cn } from "@nimia/ui";

// Default profile picture (3 Agustus 2026, per user request — "foto profil
// default kayak foto profil Facebook bawaan tapi warna Nimia"). Facebook's
// own built-in default avatar is a generic person silhouette on a flat grey
// circle; this is the same idea, recolored to Nimia's own brand gradient
// instead of grey. Shown for every client until `users.avatar_url` (see
// packages/db/migrations/0001_enums_and_users.sql) is actually set — there's
// no upload flow yet, so today this is what every client sees, but the
// component is already wired to prefer a real photo the moment one exists.
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
