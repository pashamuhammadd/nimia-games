"use client";

import * as React from "react";
import { Button } from "@nimia/ui";
import { disconnectDiscordAction } from "./actions";

// Small client island — the rest of profile/page.tsx stays a server
// component (same split as e.g. app/dashboard/orders/page.tsx +
// PaymentPanel.tsx: server component fetches/renders data, a narrow
// client component owns just the one interactive bit that needs
// useState/pending state).
export function DisconnectDiscordButton() {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        isLoading={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await disconnectDiscordAction();
            if (!result.success) {
              setError(result.error);
            }
            // On success, the server action's own revalidatePath("/dashboard/profile")
            // takes care of refreshing this page's data — no client-side
            // state to update here.
          });
        }}
      >
        Disconnect
      </Button>
      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
