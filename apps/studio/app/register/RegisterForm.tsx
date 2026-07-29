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
import { signUpAction, type ActionState } from "../actions";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signUpAction,
    null,
  );

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
          {state?.error ? <FieldError>{state.error}</FieldError> : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" isLoading={isPending} className="w-full">
            Sign up
          </Button>
          <p className="text-center text-sm text-[var(--nimia-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--nimia-crimson)]">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
