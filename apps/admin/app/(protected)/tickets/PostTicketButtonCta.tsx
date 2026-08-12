"use client";

import * as React from "react";
import { Button } from "@nimia/ui";
import { postTicketButtonAction } from "./actions";

// Small client island for the "Post Ticket Button" setup action — same
// split as TicketsList.tsx (page.tsx stays a Server Component, this owns
// just the interactive bit). Not something staff click often: once the
// "Open a Ticket" button message exists in #create-ticket, it just sits
// there — this is only for the initial setup, or re-running it if someone
// deletes the message in Discord.
export function PostTicketButtonCta() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<{ success: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-white">In-Discord ticket button</p>
        <p className="mt-0.5 text-xs text-white/45">
          Posts the &quot;Open a Ticket&quot; button into #create-ticket, so clients can open a ticket without
          leaving Discord. Only needs to run once — re-run only if the message gets deleted there.
        </p>
        {result ? (
          <p className={`mt-1.5 text-xs ${result.success ? "text-emerald-400" : "text-red-400"}`}>
            {result.message}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        isLoading={isPending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            const res = await postTicketButtonAction();
            setResult(
              res.success
                ? { success: true, message: "Posted to #create-ticket." }
                : { success: false, message: res.error },
            );
          });
        }}
        className="shrink-0"
      >
        Post Ticket Button
      </Button>
    </div>
  );
}
