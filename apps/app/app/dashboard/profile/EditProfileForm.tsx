"use client";

import * as React from "react";
import { Button, Input, Label, FieldError } from "@nimia/ui";
import { updateProfileAction, type ProfileFields } from "./actions";

// The full-dashboard half of the "edit profile" feature (new, 20 Agustus
// 2026 - see this folder's actions.ts for why editing had no update path
// at all until now). Same field set, same order, and the same inline
// "Saving.../Saved" pattern as apps/miniapp/app/account/EditProfileForm.tsx
// so the two apps feel like the same product even though they're built
// on different component systems (this one's shadcn-style @nimia/ui +
// Tailwind, the Mini App's a small hand-written CSS file - see that
// file's own comment on why unifying the CSS itself wasn't attempted
// here, only the visible design).
export function EditProfileForm({ initial }: { initial: ProfileFields }) {
  const [fields, setFields] = React.useState<ProfileFields>(initial);
  const [isPending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState<{ kind: "idle" | "error" | "success"; message?: string }>({
    kind: "idle",
  });

  function update<K extends keyof ProfileFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  function handleSave() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await updateProfileAction(fields);
      if (!result.success) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({ kind: "success", message: "Saved." });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={fields.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          placeholder="Your name"
        />
      </div>

      <div>
        <Label htmlFor="companyName">Company (optional)</Label>
        <Input
          id="companyName"
          value={fields.companyName}
          onChange={(event) => update("companyName", event.target.value)}
          placeholder="Company or project name"
        />
      </div>

      <div>
        <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
        <Input
          id="whatsapp"
          value={fields.whatsapp}
          onChange={(event) => update("whatsapp", event.target.value)}
          placeholder="+62..."
        />
      </div>

      <div>
        <Label htmlFor="country">Country (optional)</Label>
        <Input
          id="country"
          value={fields.country}
          onChange={(event) => update("country", event.target.value)}
          placeholder="Your country"
        />
      </div>

      {status.kind === "error" && <FieldError>{status.message}</FieldError>}
      {status.kind === "success" && <p className="text-sm text-emerald-400">{status.message}</p>}

      <Button type="button" onClick={handleSave} isLoading={isPending} className="self-start">
        Save changes
      </Button>
    </div>
  );
}
