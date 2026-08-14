import { redirect } from "next/navigation";

// Added 14 Agustus 2026 (dashboard split follow-up — user hit a 404 opening
// the bare app.nimiastudio.com root after the first Vercel deploy).
// apps/app deliberately has no marketing homepage — that stays on
// apps/studio (nimiastudio.com) — but leaving "/" with nothing at all means
// anyone who opens the bare domain (bookmark, typed URL, etc.) sees a 404.
// This sends them to /dashboard instead; middleware.ts's own
// PROTECTED_PREFIX check then bounces anyone not signed in straight to
// /login (with redirectedFrom=/dashboard), so both signed-in and
// signed-out visitors land somewhere useful.
export default function AppRootPage() {
  redirect("/dashboard");
}
