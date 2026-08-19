"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { Button, cn } from "@nimia/ui";
import { createSupportTicketAction } from "@/app/dashboard/support/actions";

// Shared "open a Discord ticket" CTA (19 Agustus 2026, Discord integration
// fixes — see project memory's discord_integration.md). Single place that
// owns BOTH calling createSupportTicketAction and reacting to its
// needsDiscordConnect gate, so every entry point (OrderDetail's per-order
// button, order-wizard's post-submit "Discuss this brief" button, any
// future one) gets the "must connect Discord first" prompt for free
// instead of each button re-implementing its own status state machine —
// the previous "Discuss this brief on Discord" button (18 Agustus 2026)
// did exactly that, and silently created a ticket the client could never
// actually see inside Discord if they hadn't connected their account yet.
export function DiscordTicketButton({
  subject,
  message,
  orderId,
  label = "Discuss on Discord",
  openedLabel = "Ticket opened",
  className,
}: {
  subject: string;
  message: string;
  /** Ties the ticket (and its Discord thread name) to a specific order —
   * see createSupportTicketAction's `options.orderId`. Omit for a
   * general, not-order-specific ticket. */
  orderId?: string;
  label?: string;
  openedLabel?: string;
  className?: string;
}) {
  const [status, setStatus] = React.useState<"idle" | "pending" | "success" | "error" | "needs_connect">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = React.useCallback(() => {
    if (status === "pending" || status === "success") return;
    setStatus("pending");
    setError(null);
    createSupportTicketAction(subject, message, orderId ? { orderId } : undefined)
      .then((result) => {
        if (!result.success) {
          if (result.needsDiscordConnect) {
            setStatus("needs_connect");
          } else {
            setStatus("error");
            setError(result.error);
          }
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong opening the ticket. Please try again.");
      });
  }, [status, subject, message, orderId]);

  // "Connect Discord first" prompt (the point of this whole component) —
  // opens the OAuth flow in a new tab so the client doesn't lose their
  // place on this order/brief, then lets them retry the same click once
  // they're back, rather than needing to re-navigate here from scratch.
  if (status === "needs_connect") {
    return (
      <div className={cn("rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3", className)}>
        <p className="text-sm text-white/80">
          Connect your Discord account first so we can open this ticket somewhere you can actually see it.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href="/api/discord/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4752c4]"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Connect Discord
          </a>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-xs font-medium text-white/50 transition-colors hover:text-white/80"
          >
            I&apos;ve connected — try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        isLoading={status === "pending"}
        disabled={status === "success"}
        className={
          status === "success"
            ? "border-emerald-500/40 text-emerald-400"
            : "border-[#5865F2]/40 text-[#8993f7] hover:bg-[#5865F2]/10"
        }
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {status === "success" ? openedLabel : label}
      </Button>
      {status === "error" && error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
