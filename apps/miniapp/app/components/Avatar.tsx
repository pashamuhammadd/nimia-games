import { UserRound } from "lucide-react";

/** Default profile picture — matches apps/app/app/components/dashboard/
 * Avatar.tsx exactly (same gradient-circle + person-silhouette icon,
 * same "shown until a real `users.avatar_url` exists" fallback), per
 * Pasha's "foto profil jangan huruf, tapi dibuat seperti gambar default
 * kayak di website app.nimiastudio.com" request (20 Agustus 2026) — the
 * account page previously showed letter initials instead, which read as
 * a different (and less polished) identity than the full site's. Can't
 * import that component directly (separate Next.js app, no shared
 * `@nimia/ui` export for it), so this is a deliberate 1:1 duplicate —
 * see that file's own comment for the full rationale on the gradient
 * silhouette design itself.
 *
 * Renders inside `.avatar-circle` (globals.css) for the gradient
 * background + circular clip; size is passed as inline dimensions
 * rather than a new CSS class since only two sizes are ever needed here
 * (this app currently only shows "md" on the Account page, "sm" is kept
 * for parity with the site's Avatar in case a header avatar is added
 * later). */
export function Avatar({
  avatarUrl,
  name,
  size = "sm",
}: {
  avatarUrl?: string | null;
  name?: string;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? 56 : 32;
  const iconSize = size === "md" ? 28 : 16;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a user-uploaded
      // photo is an arbitrary remote URL, not a fixed local asset next/image
      // can meaningfully optimize here (same call as the site's Avatar.tsx).
      <img
        src={avatarUrl}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className="avatar-circle"
        style={{ width: dimension, height: dimension, objectFit: "cover" }}
      />
    );
  }

  return (
    <span className="avatar-circle" style={{ width: dimension, height: dimension }} aria-hidden="true">
      <UserRound size={iconSize} strokeWidth={1.75} color="rgba(255, 255, 255, 0.9)" />
    </span>
  );
}
