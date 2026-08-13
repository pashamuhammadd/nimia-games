"use client";

import * as React from "react";
import { Check, ExternalLink } from "lucide-react";
import { cn } from "@nimia/ui";
import type { StructuredProjectData, UploadedAsset } from "../types";
import { structuredDataRows } from "../lib/structured-data-fields";
import { BriefSummaryBlock } from "./BriefSummaryBlock";

// Same fallback pattern as modules/order/components/custom-order-review-
// section.tsx — the Terms of Service page only exists on apps/www.
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";

export type CreativeAgentOrderIntent = "submit" | "negotiate";

export interface CreativeBriefCardProps {
  understanding: StructuredProjectData;
  uploadedAssets: UploadedAsset[];
  /** Set once Submit Order / Negotiate Price already succeeded for this
   * session — swaps the whole card into a short success state instead of
   * the form, and makes a second click impossible from the UI (the server
   * action is also idempotent on this, see submit-creative-agent-order-
   * action.ts, but there's no reason to even show the buttons again). */
  orderId: string | null;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (agreed: boolean) => void;
  negotiationOffer: string;
  onNegotiationOfferChange: (value: string) => void;
  onSubmit: (intent: CreativeAgentOrderIntent) => void;
  submitting: boolean;
  submitError: string | null;
}

// The final Creative Brief (P6, 13 Agustus 2026) — replaces the earlier
// placeholder closing message once a session is confirmed. Reuses the
// exact same terms-agreement copy/link and negotiation-offer pattern as
// modules/order/components/custom-order-review-section.tsx (brief §27 —
// every order path on this site should agree on what those two pieces say
// and look like), styled with Creative Agent's own gold accent instead of
// the order wizard's crimson so it still visually belongs to this surface.
export function CreativeBriefCard({
  understanding,
  uploadedAssets,
  orderId,
  agreedToTerms,
  onAgreedToTermsChange,
  negotiationOffer,
  onNegotiationOfferChange,
  onSubmit,
  submitting,
  submitError,
}: CreativeBriefCardProps) {
  const [showNegotiateInput, setShowNegotiateInput] = React.useState(false);
  const rows = structuredDataRows(understanding);

  if (orderId) {
    return (
      <div className="nimia-message-in ml-10 rounded-2xl border border-[var(--nimia-gold-soft)] bg-[var(--nimia-surface)] p-5 sm:p-6">
        <p className="nimia-font-display flex items-center gap-2 text-base font-semibold text-[var(--nimia-gold)]">
          <Check className="h-5 w-5" aria-hidden="true" />
          Your order is in
        </p>
        <p className="mt-2 text-sm text-[var(--nimia-muted)]">
          Our team will review your brief and follow up with pricing and next steps.
        </p>
        <a
          href="/dashboard/orders"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--nimia-gold)] hover:underline"
        >
          View it in your dashboard
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="nimia-message-in ml-10 rounded-2xl border border-[var(--nimia-gold-soft)] bg-[var(--nimia-surface)] p-5 sm:p-6">
      <p className="nimia-font-display text-base font-semibold text-[var(--nimia-gold)]">Your Creative Brief</p>
      <p className="mt-1.5 text-sm text-[var(--nimia-muted)]">
        Everything you&rsquo;ve shared, saved. Submit it as-is, or open a price negotiation with our team.
      </p>

      <div className="mt-4">
        <BriefSummaryBlock understanding={understanding} />
      </div>

      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-4">
            <dt className="col-span-1 text-[var(--nimia-muted)]">{row.label}</dt>
            <dd className="col-span-2 text-[var(--foreground)] sm:col-span-3">{row.value}</dd>
          </div>
        ))}
      </dl>

      {uploadedAssets.length > 0 ? (
        <div className="mt-4 border-t border-[var(--nimia-border)] pt-4">
          <p className="text-sm text-[var(--nimia-muted)]">Attached files</p>
          <ul className="mt-2 space-y-1">
            {uploadedAssets.map((file) => (
              <li key={file.url}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--foreground)] underline decoration-[var(--nimia-gold-soft)] underline-offset-2 hover:text-[var(--nimia-gold)]"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        role="checkbox"
        aria-checked={agreedToTerms}
        aria-label="I confirm the details above are correct and agree to Nimia Studio's project terms"
        tabIndex={0}
        onClick={() => onAgreedToTermsChange(!agreedToTerms)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onAgreedToTermsChange(!agreedToTerms);
          }
        }}
        className="mt-5 flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[var(--nimia-border)] bg-black/10 p-4 text-left transition-colors hover:bg-black/20"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
            agreedToTerms ? "border-[var(--nimia-gold)] bg-[var(--nimia-gold)]" : "border-[var(--nimia-border)]",
          )}
        >
          {agreedToTerms ? <Check className="h-3.5 w-3.5 text-[#1a0f14]" strokeWidth={3} aria-hidden="true" /> : null}
        </span>
        <span className="text-sm text-[var(--nimia-muted)]">
          I confirm the details above are correct and agree to Nimia Studio&rsquo;s{" "}
          <a
            href={`${WWW_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-[var(--foreground)] underline decoration-[var(--nimia-gold-soft)] underline-offset-2 hover:text-[var(--nimia-gold)]"
          >
            project terms
          </a>
          . A final quotation will be confirmed with the team before production begins.
        </span>
      </div>

      {showNegotiateInput ? (
        <div className="mt-4 rounded-xl border border-[var(--nimia-border)] bg-black/10 p-4">
          <label htmlFor="creative-agent-negotiation-offer" className="text-sm text-[var(--nimia-muted)]">
            What would you like to offer? Our team will review it and either approve it or send a counter offer.
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-3 py-2">
            <span className="text-sm text-[var(--nimia-muted)]">USD</span>
            <input
              id="creative-agent-negotiation-offer"
              type="number"
              min={1}
              inputMode="decimal"
              placeholder={understanding.budget ? `e.g. ${understanding.budget}` : "e.g. 500"}
              value={negotiationOffer}
              onChange={(event) => onNegotiationOfferChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--nimia-muted)] focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {submitError ? <p className="mt-4 text-sm text-red-400">{submitError}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!agreedToTerms || submitting}
          onClick={() => onSubmit("submit")}
          className="rounded-full bg-[var(--nimia-gold)] px-5 py-2 text-sm font-semibold text-[#1a0f14] transition-transform duration-200 ease-out hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Order"}
        </button>
        <button
          type="button"
          disabled={!agreedToTerms || submitting}
          onClick={() => {
            if (!showNegotiateInput) {
              setShowNegotiateInput(true);
              return;
            }
            onSubmit("negotiate");
          }}
          className="rounded-full border border-[var(--nimia-border)] px-5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--nimia-gold-soft)] disabled:pointer-events-none disabled:opacity-60"
        >
          {showNegotiateInput ? (submitting ? "Sending…" : "Send Offer") : "Negotiate Price"}
        </button>
      </div>

      <p className="mt-3 text-xs text-[var(--nimia-muted)]/70">
        You&rsquo;ll be asked to sign in first if you haven&rsquo;t already — your brief will be waiting when you get back.
      </p>
    </div>
  );
}
