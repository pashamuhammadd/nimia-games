"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "./actions";
import { DURATION_OPTIONS, estimatePriceUsd, type DurationSec } from "./pricing";

interface FormFields {
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  deadline: string;
  description: string;
  referenceLink: string;
  durationSec: DurationSec;
  clientOffer: string;
}

// The Mini App's in-app order intake form (new, 20 Agustus 2026). Same
// useTransition + inline-feedback shape as
// app/account/EditProfileForm.tsx and app/orders/[orderId]/
// NegotiationPanel.tsx already established in this app - no full page
// reload while submitting, and on success it routes straight to the new
// order's detail page rather than back to Services.
//
// Follow-up, same day, per Pasha's "formnya harus ada pilihan detik nya
// ... harus muncul otomatis juga harga estimasinya, dan tekankan bahwa
// harga itu bisa di nego": swapped the old freeform "Target budget" text
// field for a Duration select (10-60 sec, ./pricing.ts) that drives a
// live estimate shown right in the form, plus an optional "Your offer"
// field. Leaving that field blank submits like apps/app's "Submit for
// review" (staff quotes first, status stays pending_review); filling it
// in submits like apps/app's "Negotiate Price" (status goes straight to
// negotiating with the client's own opening offer already in
// order_negotiations) - see ./actions.ts for exactly how that mirrors
// apps/app/modules/order/state/submit-order-action.ts's `intent` field.
export function NewOrderForm({
  offeringKey,
  offeringLabel,
  hint,
  initial,
}: {
  offeringKey: string;
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
    deadline: "",
    description: "",
    referenceLink: "",
    durationSec: "10",
    clientOffer: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(
    () => estimatePriceUsd(offeringKey, fields.durationSec),
    [offeringKey, fields.durationSec],
  );

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit() {
    if (!fields.fullName.trim() || !fields.email.trim() || !fields.description.trim()) {
      setError("Name, email, and project details are required.");
      return;
    }
    const trimmedOffer = fields.clientOffer.trim();
    if (trimmedOffer) {
      const parsed = Number(trimmedOffer);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setError("Enter a valid offer amount, or leave it blank.");
        return;
      }
    }
    setError(null);
    startTransition(async () => {
      const result = await createOrderAction({
        offeringKey,
        offeringLabel,
        durationSec: fields.durationSec,
        clientOfferUsd: trimmedOffer ? Number(trimmedOffer) : null,
        fullName: fields.fullName,
        email: fields.email,
        whatsapp: fields.whatsapp,
        country: fields.country,
        deadline: fields.deadline,
        description: fields.description,
        referenceLink: fields.referenceLink,
      });
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
        <label className="form-label" htmlFor="durationSec">
          Duration
        </label>
        <select
          id="durationSec"
          className="text-input"
          value={fields.durationSec}
          onChange={(event) => update("durationSec", event.target.value as DurationSec)}
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} sec
            </option>
          ))}
        </select>
      </div>

      <div className="estimate-row">
        <span className="label">Estimated price</span>
        <span className="amount">${estimate.toLocaleString("en-US")}</span>
      </div>
      <p className="estimate-note">
        This is just a starting estimate for a {fields.durationSec} sec {offeringLabel.toLowerCase()} — it&apos;s
        flexible, and you can negotiate the final price with our team below or after you submit.
      </p>

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
        <label className="form-label" htmlFor="clientOffer">
          Your offer (optional)
        </label>
        <input
          id="clientOffer"
          type="number"
          min={1}
          inputMode="decimal"
          className="text-input"
          value={fields.clientOffer}
          onChange={(event) => update("clientOffer", event.target.value)}
          placeholder={`Propose your own price instead of $${estimate.toLocaleString("en-US")}`}
        />
        <p className="save-hint" style={{ color: "var(--text-muted)" }}>
          Leave this blank and we&apos;ll send you a quote first. Enter an amount to open negotiation right away.
        </p>
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
        {isPending ? "Sending…" : fields.clientOffer.trim() ? "Submit & Send Offer" : "Submit Order"}
      </button>
    </div>
  );
}
