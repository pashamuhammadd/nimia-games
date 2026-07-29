"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactFormValues } from "@nimia/validators";
import {
  Button,
  Input,
  Textarea,
  Label,
  FieldError,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@nimia/ui";
import { sendContactMessageAction } from "./actions";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    // Same `as any` cast on the schema (not the resolver's return value)
    // used in OrderForm.tsx — avoids TS's "Type instantiation is
    // excessively deep" error, no effect on runtime validation.
    resolver: zodResolver(contactFormSchema as any),
  });

  const onSubmit = async (values: ContactFormValues) => {
    setServerError(null);
    const result = await sendContactMessageAction(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Message sent 🎉</CardTitle>
          <CardDescription>
            Thanks for reaching out — the Nimia Games team will get back to
            you by email soon.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Get in touch</CardTitle>
        <CardDescription>
          Tell us a bit about what you need, and we&apos;ll reply by email.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" invalid={!!errors.name} {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} invalid={!!errors.message} {...register("message")} />
            <FieldError>{errors.message?.message}</FieldError>
          </div>

          {serverError ? <FieldError>{serverError}</FieldError> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Send message
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
