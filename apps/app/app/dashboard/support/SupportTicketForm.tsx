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
  // "Connect Discord first" gate (19 Agustus 2026, per user request — see
  // createSupportTicketAction's needsDiscordConnect). Kept separate from
  // `error` so this form can show the richer connect-prompt card instead
  // of just the plain FieldError text for this one case.
  const [needsDiscordConnect, setNeedsDiscordConnect] = React.useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(false);
        setNeedsDiscordConnect(false);
        startTransition(async () => {
          const result = await createSupportTicketAction(subject, message);
          if (!result.success) {
            setError(result.error);
            setNeedsDiscordConnect(Boolean(result.needsDiscordConnect));
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
      <FieldError>{!needsDiscordConnect ? error : null}</FieldError>
      {needsDiscordConnect ? (
        <div className="rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3">
          <p className="text-sm text-white/80">{error}</p>
          <a
            href="/api/discord/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4752c4]"
          >
            Connect Discord
          </a>
        </div>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-400">Ticket opened — we&apos;ll follow up soon.</p>
      ) : null}
      <Button type="submit" isLoading={isPending} className="self-start">
        Open Ticket
      </Button>
    </form>
  );
}
