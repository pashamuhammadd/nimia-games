"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orderFormSchema, type OrderFormValues } from "@nimia/validators";
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  FieldError,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@nimia/ui";
import { createOrderAction } from "./actions";

type ServiceOption = { id: string; name: string };

export function OrderForm({
  services,
  defaultEmail,
}: {
  services: ServiceOption[];
  defaultEmail?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    // Casting the SCHEMA (the argument going IN to zodResolver) to `any` —
    // not the resolver's return value — is what actually avoids "Type
    // instantiation is excessively deep and possibly infinite". Casting the
    // *result* (tried first) doesn't help: TS still has to fully compute
    // zodResolver's return type before a cast can apply to it, and that
    // computation is what blows up. Casting the input short-circuits
    // TypeScript's inference before it ever walks the schema. Runtime
    // behavior is unaffected — zod still validates the real shape at
    // runtime either way, this only changes what TypeScript infers.
    resolver: zodResolver(orderFormSchema as any),
    defaultValues: {
      email: defaultEmail ?? "",
    },
  });

  const onSubmit = async (values: OrderFormValues) => {
    setServerError(null);
    const result = await createOrderAction(values);
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
          <CardTitle>Order submitted 🎉</CardTitle>
          <CardDescription>
            The Nimia Games team will review your order and reach out via
            email/WhatsApp with a quote.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Submit a new order</CardTitle>
        <CardDescription>Tell us about your project, and our team will send you a quote.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="service_id">Service</Label>
            <Select
              id="service_id"
              defaultValue=""
              invalid={!!errors.service_id}
              {...register("service_id")}
            >
              <option value="" disabled>
                Select a service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.service_id?.message}</FieldError>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" invalid={!!errors.full_name} {...register("full_name")} />
              <FieldError>{errors.full_name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company_name">Company (optional)</Label>
              <Input id="company_name" {...register("company_name")} />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
              <Input id="whatsapp" {...register("whatsapp")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="country">Country (optional)</Label>
              <Input id="country" {...register("country")} />
            </div>
            <div>
              <Label htmlFor="budget">Estimated budget (optional)</Label>
              <Input id="budget" placeholder="e.g. $1,000" {...register("budget")} />
            </div>
          </div>

          <div>
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input id="deadline" type="date" {...register("deadline")} />
          </div>

          <div>
            <Label htmlFor="description">Project description</Label>
            <Textarea
              id="description"
              rows={5}
              invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="reference_link">Reference link (optional)</Label>
            <Input
              id="reference_link"
              placeholder="https://..."
              invalid={!!errors.reference_link}
              {...register("reference_link")}
            />
            <FieldError>{errors.reference_link?.message}</FieldError>
          </div>

          {serverError ? <FieldError>{serverError}</FieldError> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Submit order
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
