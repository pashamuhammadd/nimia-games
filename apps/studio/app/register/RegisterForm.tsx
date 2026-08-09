"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import {
  Button,
  Input,
  Label,
  FieldError,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cn,
} from "@nimia/ui";
import { signUpAction, type ActionState } from "../actions";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/modules/partners";

// Same fallback pattern as app/components/Footer.tsx — the Privacy Policy
// and Terms of Service pages only exist on apps/www, not here.
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";

export function RegisterForm({ initialReferralCode = "" }: { initialReferralCode?: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signUpAction,
    null,
  );

  // Referral Code field is optional, auto-filled from the referral link's
  // cookie (see register/page.tsx), but stays editable up until the account
  // is actually created (brief: "User tetap dapat menggantinya sebelum akun
  // dibuat"). NOTE: `signUpAction` doesn't read/persist this field yet —
  // there's no `partners`/`referrals` table for it to write to (Tahap 5+,
  // see modules/partners/types/partner.ts's header comment). The field is
  // named "referral_code" and submits with the form regardless, so wiring
  // it up later is a formData.get("referral_code") away, not a form change.
  const [referralCode, setReferralCode] = React.useState(initialReferralCode);
  const [applied, setApplied] = React.useState(false);
  const [referralError, setReferralError] = React.useState<string | null>(null);

  function handleApply() {
    const normalized = normalizeReferralCode(referralCode);
    if (normalized === "") {
      setApplied(false);
      setReferralError(null);
      return;
    }
    if (!isValidReferralCodeFormat(normalized)) {
      setApplied(false);
      setReferralError("That doesn't look like a valid referral code.");
      return;
    }
    setReferralCode(normalized);
    setApplied(true);
    setReferralError(null);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create a client account</CardTitle>
        <CardDescription>
          Used to submit orders and track your projects on Nimia Studio.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" autoComplete="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company_name">Company (optional)</Label>
              <Input id="company_name" name="company_name" autoComplete="organization" />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
              <Input id="whatsapp" name="whatsapp" autoComplete="tel" />
            </div>
          </div>
          <div>
            <Label htmlFor="country">Country (optional)</Label>
            <Input id="country" name="country" autoComplete="country-name" />
          </div>
          <div>
            <Label htmlFor="referral_code">Referral Code (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="referral_code"
                name="referral_code"
                placeholder="e.g. NM8K2P4Q"
                value={referralCode}
                maxLength={8}
                invalid={Boolean(referralError)}
                onChange={(event) => {
                  setReferralCode(event.target.value.toUpperCase());
                  setApplied(false);
                  setReferralError(null);
                }}
                className="font-mono uppercase tracking-wider"
              />
              <button
                type="button"
                onClick={handleApply}
                disabled={referralCode.trim() === ""}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  applied
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-[var(--nimia-border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--nimia-surface)]",
                )}
              >
                {applied ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                {applied ? "Applied" : "Apply"}
              </button>
            </div>
            {referralError ? (
              <FieldError>{referralError}</FieldError>
            ) : applied ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                <Check className="h-3 w-3" aria-hidden="true" />
                Referral code applied. You can still change it before creating your account.
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--nimia-muted)]">
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Have a partner's link or code? Enter it here: this can't be changed once your account is created.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {/* Privacy Policy / Terms consent (9 Agustus 2026, launch-readiness
              audit finding — this form used to create an account with real
              personal data (name, email, WhatsApp, country) with no consent
              step at all, even though Privacy Policy/Terms of Service pages
              already existed on apps/www. `required` makes the browser block
              submission until this is checked; signUpAction below also
              re-checks agreed_to_terms server-side (same defense-in-depth
              pattern every other server action in this app already follows)
              since a native checkbox's `required` attribute is a client-side
              nicety, not something the server can trust on its own. */}
          <div className="flex items-start gap-2.5">
            <input
              id="agreed_to_terms"
              name="agreed_to_terms"
              type="checkbox"
              required
              value="true"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--nimia-border)] accent-[var(--nimia-pink)]"
            />
            <Label htmlFor="agreed_to_terms" className="text-sm font-normal leading-snug">
              I agree to Nimia Studio&apos;s{" "}
              <a
                href={`${WWW_URL}/terms`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--nimia-pink)] hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={`${WWW_URL}/privacy`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--nimia-pink)] hover:underline"
              >
                Privacy Policy
              </a>
              .
            </Label>
          </div>

          {state?.error ? <FieldError>{state.error}</FieldError> : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" isLoading={isPending} className="w-full">
            Sign up
          </Button>
          <p className="text-center text-sm text-[var(--nimia-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--nimia-pink)]">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
