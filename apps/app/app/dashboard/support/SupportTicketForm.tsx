"use client";

import * as React from "react";
import { Button, Input, Textarea, Label, FieldError } from "@nimia/ui";
import { createSupportTicketAction } from "./actions";

// Small client island — same split as DisconnectDiscordButton.tsx
// (apps/studio/app/dashboard/profile): page.tsx stays a Server Component
// that fetches the ticket list, this owns just the interactive form bit.
export function SupportTicketForm() {
  const [isPending, startTransition] = React.useTransition();
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await createSupportTicketAction(subject, message);
          if (!result.success) {
            setError(result.error);
            return;
          }
          setSubject("");
          setMessage("");
          setSuccess(true);
          // The server action's own revalidatePath("/dashboard/support")
          // refreshes the ticket list below — no client-side list state
          // to update here.
        });
      }}
    >
      <div>
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Question about my order"
          maxLength={120}
          disabled={isPending}
        />
      </div>
      <div>
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what's going on — include an order ID if this is about a specific project."
          rows={4}
          disabled={isPending}
        />
      </div>
      <FieldError>{error}</FieldError>
      {success ? (
        <p className="text-sm text-emerald-400">Ticket opened — we&apos;ll follow up soon.</p>
      ) : null}
      <Button type="submit" isLoading={isPending} className="self-start">
        Open Ticket
      </Button>
    </form>
  );
}
