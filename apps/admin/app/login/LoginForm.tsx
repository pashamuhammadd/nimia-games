"use client";

import { useActionState } from "react";
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

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signInAction,
    initialError ? { error: initialError } : null,
  );

  return (
    <Card className="w-full max-w-sm border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="nimia-font-display text-2xl tracking-wide text-white">
          Nimia <span className="nimia-gradient-text">Admin</span>
        </CardTitle>
        <CardDescription className="text-white/50">
          Staff &amp; founder sign-in only.
        </CardDescription>
      </CardHeader>
      <form action={formAction} noValidate>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-white/80">
              Email
            </Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password" className="text-white/80">
              Password
            </Label>
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
        <CardFooter>
          <Button type="submit" isLoading={isPending} className="w-full">
            Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
