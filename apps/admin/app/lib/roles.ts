// Single source of truth for "which public.users.role values count as
// admin-tier" (migration 0011/0013, packages/db/migrations). 'admin' is
// the pre-Tahap-5 role, kept for backward compatibility with any row that
// still has it — 'staff' and 'founder' are what new accounts get going
// forward. Used by both app/actions.ts (sign-in gate) and
// app/(protected)/layout.tsx (per-request gate) so the two never drift.
export const ADMIN_TIER_ROLES = ["admin", "staff", "founder"] as const;

export type AdminTierRole = (typeof ADMIN_TIER_ROLES)[number];

export function isAdminTierRole(role: string | null | undefined): role is AdminTierRole {
  return !!role && (ADMIN_TIER_ROLES as readonly string[]).includes(role);
}

// Only 'founder' gets the finance page (docs/ARCHITECTURE.md section 1:
// "staff ... TIDAK bisa lihat halaman keuangan"). Legacy 'admin' rows are
// treated as staff-level, NOT founder-level, here — deliberately narrower
// than is_admin() at the database level, since ARCHITECTURE.md is explicit
// that finance access should be founder-only, and nothing should
// automatically inherit it just by predating this migration.
export function isFounderRole(role: string | null | undefined): boolean {
  return role === "founder";
}
