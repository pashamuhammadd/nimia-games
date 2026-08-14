"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signInSchema, signUpSchema } from "@nimia/validators";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/modules/partners";
import { notifyPartnerJoined } from "@nimia/discord";

export type ActionState = { error?: string } | null;

function str(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// Only ever redirect somewhere INSIDE this app after login — `redirectedFrom`
// arrives as plain form data (see LoginForm.tsx's hidden field), so it must
// be treated as untrusted input. A single leading "/" (not "//", which
// browsers resolve as protocol-relative — an open-redirect vector) is the
// only shape allowed through; anything else falls back to "/dashboard".
function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = str(value);
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/dashboard";
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

  // Lets /order's Project Configurator send an unauthenticated visitor here
  // with `?redirectedFrom=/order` (see modules/order/state/use-order-wizard.ts
  // #submit) and land them back on Review Order instead of always /dashboard
  // — same mechanism middleware.ts already sets on protected routes, just
  // actually consumed here now.
  redirect(safeRedirectTarget(formData.get("redirectedFrom")));
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

  // Privacy Policy / Terms of Service consent (9 Agustus 2026,
  // launch-readiness audit finding). RegisterForm.tsx's checkbox already
  // has `required`, which blocks a normal browser submission — but that's
  // client-side only, so this re-checks server-side too, same
  // defense-in-depth pattern every other action in this app follows for
  // things the client claims. Checked BEFORE calling auth.signUp() so an
  // account is never created without consent recorded on the request that
  // created it.
  if (formData.get("agreed_to_terms") !== "true") {
    return { error: "Please agree to the Terms of Service and Privacy Policy to continue." };
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

  // Discord gamification phase (11 Agustus 2026) — "explicit partner
  // intent" per user decision: a visitor who came through the /partners
  // marketing page (Gold-floor bonus, migration 0030) or who entered a
  // referral code. Every account technically becomes a Partner on signup
  // regardless (self-serve, migration 0016) — this flag is ONLY used
  // below to decide whether to post to Discord's #partner-joined, never to
  // gate anything about the account itself.
  const joinedViaPartnerPage = formData.get("joined_via_partner_page") === "true";
  const showedPartnerIntent = joinedViaPartnerPage || Boolean(validReferralCode);

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
        joined_via_partner_page: joinedViaPartnerPage || undefined,
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

  // Added 11 Agustus 2026 (Discord gamification phase) — docs/DISCORD.md's
  // "Partner Discord Channel" #partner-joined: "Ketika seseorang berhasil
  // mendaftar sebagai Partner ... Bot otomatis mengirim notification."
  // Fired here (not from a DB trigger — handle_new_auth_user(), 0016,
  // can't call out to Discord's REST API) right after signUp() succeeds,
  // same fire-and-log posture as every other Discord notification in this
  // app. Only for signups that showed explicit partner intent — see this
  // function's own comment above and notifyPartnerJoined's comment in
  // @nimia/discord for why NOT every signup. `level` is only ever passed
  // for the /partners-page floor (always Gold) — see notifyPartnerJoined's
  // comment for why a plain referral-code signup's level is left
  // unstated rather than guessed.
  if (showedPartnerIntent) {
    await notifyPartnerJoined({
      fullName: parsed.data.full_name,
      level: joinedViaPartnerPage ? "🥇 Gold" : undefined,
    });
  }

  redirect("/register/check-email");
}

export async function signOutAction() {
  const supabase = createServerClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
