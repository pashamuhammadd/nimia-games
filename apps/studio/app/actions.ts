"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signInSchema, signUpSchema } from "@nimia/validators";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/modules/partners";

export type ActionState = { error?: string } | null;

function str(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export async function signInAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = createServerClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message,
    };
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Optional Referral Code field from RegisterForm.tsx (pre-filled from
  // the nimia_referral_code cookie when the visitor came via a partner's
  // /r/:code link — see app/register/page.tsx). Only forwarded if it's at
  // least well-formed; a typo'd/malformed code is silently dropped here
  // rather than passed through — same validation
  // app/r/[code]/route.ts already applies before setting that cookie.
  // Actually crediting the referral (looking the code up, creating a
  // partner_referrals row) happens entirely inside the
  // handle_new_auth_user() Postgres trigger (see migration
  // 0016_partner_program.sql) once auth.signUp() below creates the user —
  // this action never touches the partners tables directly.
  const rawReferralCode = str(formData.get("referral_code"));
  const referralCode = rawReferralCode ? normalizeReferralCode(rawReferralCode) : undefined;
  const validReferralCode =
    referralCode && isValidReferralCodeFormat(referralCode) ? referralCode : undefined;

  const supabase = createServerClient(await cookies());
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        company_name: str(formData.get("company_name")),
        whatsapp: str(formData.get("whatsapp")),
        country: str(formData.get("country")),
        referral_code: validReferralCode,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
    },
  });
  if (error) {
    return {
      error:
        error.message === "User already registered"
          ? "This email is already registered. Try logging in."
          : error.message,
    };
  }

  redirect("/register/check-email");
}

export async function signOutAction() {
  const supabase = createServerClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
