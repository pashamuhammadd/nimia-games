"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "./actions";

interface FormFields {
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  budget: string;
  deadline: string;
  description: string;
  referenceLink: string;
}

// The Mini App's in-app order intake form (new, 20 Agustus 2026). Same
// useTransition + inline-feedback shape as
// app/account/EditProfileForm.tsx and app/orders/[orderId]/
// NegotiationPanel.tsx already established in this app - no full page
// reload while submitting, and on success it routes straight to the new
// order's detail page rather than back to Services.
export function NewOrderForm({
  offeringLabel,
  hint,
  initial,
}: {
  offeringLabel: string;
  hint: string;
  initial: { fullName: string; email: string; whatsapp: string; country: string };
}) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>({
    fullName: initial.fullName,
    email: initial.email,
    whatsapp: initial.whatsapp,
    country: initial.country,
    budget: "",
    deadline: "",
    description: "",
    referenceLink: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit() {
    if (!fields.fullName.trim() || !fields.email.trim() || !fields.description.trim()) {
      setError("Name, email, and project details are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createOrderAction({ offeringLabel, ...fields });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/orders/${result.orderId}`);
    });
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="form-row">
        <label className="form-label" htmlFor="description">
          Project details
        </label>
        <textarea
          id="description"
          className="text-input"
          rows={4}
          value={fields.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder={hint}
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="referenceLink">
          Reference link (optional)
        </label>
        <input
          id="referenceLink"
          className="text-input"
          value={fields.referenceLink}
          onChange={(event) => update("referenceLink", event.target.value)}
          placeholder="Twitter, Discord, or a file link"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="budget">
          Target budget (optional)
        </label>
        <input
          id="budget"
          className="text-input"
          value={fields.budget}
          onChange={(event) => update("budget", event.target.value)}
          placeholder="e.g. $150 — flexible, we'll agree together"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="deadline">
          Deadline (optional)
        </label>
        <input
          id="deadline"
          type="date"
          className="text-input"
          value={fields.deadline}
          onChange={(event) => update("deadline", event.target.value)}
        />
      </div>

      <hr className="divider" />

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
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="text-input"
          value={fields.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="you@example.com"
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

      {error && <p className="error-text">{error}</p>}

      <button type="button" className="cta-button" disabled={isPending} onClick={handleSubmit}>
        {isPending ? "Sending…" : "Submit Order"}
      </button>
    </div>
  );
}
