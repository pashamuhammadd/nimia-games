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

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signInAction,
    null,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in to Nimia Studio</CardTitle>
        <CardDescription>Use your client account email and password.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error ? <FieldError>{state.error}</FieldError> : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" isLoading={isPending} className="w-full">
            Log in
          </Button>
          <p className="text-center text-sm text-[var(--nimia-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[var(--nimia-crimson)]">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
