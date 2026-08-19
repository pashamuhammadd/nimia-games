"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@nimia/ui";
import { closeSupportTicketAction } from "./actions";

export type TicketRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  full_name: string | null;
  company_name: string | null;
  email: string;
  discord_url: string | null;
  created_at: string;
  // ORD-XXXXXXXX — Title, when this ticket was opened via a per-order
  // "Discuss on Discord" button (19 Agustus 2026, migration
  // 0053_support_ticket_order_link.sql) — null for a general ticket opened
  // from the website's /dashboard/support form with no order in mind.
  order_label: string | null;
};

// Client island for the one interactive bit (Close button) — same split
// as apps/studio's DisconnectDiscordButton.tsx / SupportTicketForm.tsx.
// Takes the already-fetched rows as a prop rather than re-fetching, so
// closing a ticket just needs router refresh via the server action's own
// revalidatePath("/tickets") — no client-side data fetching here.
export function TicketsList({ tickets }: { tickets: TicketRow[] }) {
  const [isPending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [errorId, setErrorId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center text-sm text-white/50">
        No support tickets yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((ticket) => {
        const clientName = ticket.full_name ?? ticket.company_name ?? ticket.email;
        const isRowPending = isPending && pendingId === ticket.id;
        return (
          <div
            key={ticket.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{ticket.subject}</p>
                <span
                  className={
                    ticket.status === "open"
                      ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
                      : "rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/50"
                  }
                >
                  {ticket.status === "open" ? "Open" : "Closed"}
                </span>
                {ticket.order_label ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-white/60">
                    {ticket.order_label}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-white/45">
                {clientName} · {ticket.email} ·{" "}
                {new Date(ticket.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{ticket.message}</p>
              {ticket.discord_url ? (
                <a
                  href={ticket.discord_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--nimia-pink)] hover:underline"
                >
                  Open in Discord
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
              {errorId === ticket.id && error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            </div>
            {ticket.status === "open" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isRowPending}
                onClick={() => {
                  setError(null);
                  setErrorId(null);
                  setPendingId(ticket.id);
                  startTransition(async () => {
                    const result = await closeSupportTicketAction(ticket.id);
                    if (!result.success) {
                      setErrorId(ticket.id);
                      setError(result.error);
                    }
                  });
                }}
                className="shrink-0"
              >
                Close Ticket
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
