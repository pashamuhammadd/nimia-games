"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, type ProfileFields } from "./actions";

// The Mini App half of the "edit profile" feature (new, 20 Agustus 2026).
// Deliberately its own client component rather than a plain
// `<form action={...}>` like this app's other two buttons
// (disconnectTelegramAction/logoutAction) - those redirect on success and
// don't need inline feedback, this one needs to show a "Saved" message
// without a full page reload, so it calls the server action directly
// inside a transition, same pattern as
// app/orders/[orderId]/NegotiationPanel.tsx already established here.
export function EditProfileForm({ initial }: { initial: ProfileFields }) {
  const router = useRouter();
  const [fields, setFields] = useState<ProfileFields>(initial);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" | "error" | "success"; message?: string }>({
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
      router.refresh();
    });
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="section-title" style={{ marginTop: 0 }}>
        Edit profile
      </p>

      <div className="form-row">
        <label className="form-label" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          className="text-input"
          value={fields.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="companyName">
          Company (optional)
        </label>
        <input
          id="companyName"
          className="text-input"
          value={fields.companyName}
          onChange={(event) => update("companyName", event.target.value)}
          placeholder="Company or project name"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="whatsapp">
          WhatsApp (optional)
        </label>
        <input
          id="whatsapp"
          className="text-input"
          value={fields.whatsapp}
          onChange={(event) => update("whatsapp", event.target.value)}
          placeholder="+62..."
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="country">
          Country (optional)
        </label>
        <input
          id="country"
          className="text-input"
          value={fields.country}
          onChange={(event) => update("country", event.target.value)}
          placeholder="Your country"
        />
      </div>

      {status.kind === "error" && <p className="error-text">{status.message}</p>}
      {status.kind === "success" && <p className="save-hint success">{status.message}</p>}

      <button type="button" className="cta-button" disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
