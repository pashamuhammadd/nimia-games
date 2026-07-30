"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { isAdminTierRole } from "./lib/roles";

export type ActionState = { error?: string } | null;

// Deliberately plain (no zod/@nimia/validators) — this is a 2-field form and
// adding a shared-package dependency for it isn't worth the coupling. Every
// other write in this app goes through Supabase directly, which is where
// the real validation boundary (RLS + is_admin()) lives anyway.
export async function signInAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createServerClient(await cookies());
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return {
      error:
        error?.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : (error?.message ?? "Could not sign in."),
    };
  }

  // Gate at sign-in time as a fast, friendly first check — the real
  // enforcement is public.is_admin() at the database level (see
  // packages/db/migrations/0006_rls_policies.sql) plus the redundant check
  // in app/(protected)/layout.tsx, so a demoted account can never keep
  // using this app just because it once passed this check.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!isAdminTierRole(profile?.role)) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = createServerClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
