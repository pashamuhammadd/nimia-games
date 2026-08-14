"use client";

import { useActionState } from "react";
import Link from "next/link";
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
} from "@nimia/ui";
import { signInAction, type ActionState } from "../actions";

// `variant="modal"` is used by the navbar's quick-login modal (Tahap 5,
// sub-stage 1) — it renders the exact same form/fields/server action as
// the full /login page, just without the outer Card chrome (the Modal
// component from @nimia/ui already supplies its own panel/border/shadow,
// so nesting another Card inside it would double up the border).
export function LoginForm({
  variant = "page",
  onSuccess,
  redirectedFrom,
}: {
  variant?: "page" | "modal";
  onSuccess?: () => void;
  /** Forwarded into signInAction as a hidden field so a successful login
   * can redirect somewhere other than /dashboard — see app/actions.ts
   * #signInAction and modules/order's Submit Order flow. Only ever set by
   * the "page" variant's caller (app/login/page.tsx); the navbar's quick
   * modal has no redirect target of its own. */
  redirectedFrom?: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signInAction,
    null,
  );

  const fields = (
    <>
      {redirectedFrom ? <input type="hidden" name="redirectedFrom" value={redirectedFrom} /> : null}
      <div>
        <Label htmlFor={variant === "modal" ? "modal-email" : "email"}>Email</Label>
        <Input
          id={variant === "modal" ? "modal-email" : "email"}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor={variant === "modal" ? "modal-password" : "password"}>Password</Label>
        <Input
          id={variant === "modal" ? "modal-password" : "password"}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error ? <FieldError>{state.error}</FieldError> : null}
    </>
  );

  const footer = (
    <>
      <Button type="submit" isLoading={isPending} className="w-full">
        Log in
      </Button>
      <p className="text-center text-sm text-[var(--nimia-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-[var(--nimia-pink)]" onClick={onSuccess}>
          Sign up
        </Link>
      </p>
    </>
  );

  // Note: on success, signInAction redirects server-side to /dashboard —
  // there's no client-side "close the modal" moment to hook into, the
  // whole page navigates away. onSuccess is only used for the "Sign up"
  // link above, so the modal doesn't stay open behind the new page.
  if (variant === "modal") {
    return (
      <form action={formAction}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Log in to Nimia Studio</h2>
          <p className="text-sm text-[var(--nimia-muted)]">Use your client account email and password.</p>
        </div>
        <div className="flex flex-col gap-4">{fields}</div>
        <div className="mt-5 flex flex-col items-stretch gap-3">{footer}</div>
        <p className="mt-3 text-center text-xs text-[var(--nimia-muted)]">
          Prefer a full page?{" "}
          <Link href="/login" className="font-medium text-[var(--nimia-pink)]" onClick={onSuccess}>
            Use the login page instead
          </Link>
        </p>
      </form>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in to Nimia Studio</CardTitle>
        <CardDescription>Use your client account email and password.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">{fields}</CardContent>
        <CardFooter className="flex-col items-stretch gap-3">{footer}</CardFooter>
      </form>
    </Card>
  );
}
