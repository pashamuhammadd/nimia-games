"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptNegotiationOfferAction,
  rejectNegotiationOfferAction,
  sendClientCounterOfferAction,
  type NegotiationActionResult,
} from "./actions";

interface Offer {
  id: string;
  proposed_by: string;
  amount_usd: number;
  message: string | null;
  created_at: string;
}

// The client-facing half of order_negotiations (docs: apps/app/app/
// dashboard/negotiations/NegotiationThreadList.tsx is the direct
// template this mirrors - same left/right bubble convention, same
// accept/reject/counter actions, same "only respond when it's actually
// your turn" gate). A second UI on the exact same RPCs
// (accept_negotiation_offer / reject_negotiation_offer,
// packages/db/migrations/0019_client_negotiation_actions.sql), not a
// second implementation of what those actions DO - see this folder's
// actions.ts for why that distinction matters here.
export function NegotiationPanel({
  orderId,
  status,
  finalPriceUsd,
  offers,
}: {
  orderId: string;
  status: string;
  finalPriceUsd: number | null;
  offers: Offer[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [counterOffer, setCounterOffer] = useState("");

  const latestOffer = offers[offers.length - 1] ?? null;
  // Same rule as the full dashboard's canRespond: only the studio's own
  // offer, on an order still open for negotiation, is something the
  // client owes a response to - if the client made the last move, they
  // sent it, they're waiting, not owed a turn.
  const canRespond = status === "negotiating" && latestOffer?.proposed_by === "staff";

  function run(action: () => Promise<NegotiationActionResult>, doneMessage: string, wasAccept = false) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setActionTaken(doneMessage);
      if (wasAccept) setAccepted(true);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <p className="section-title" style={{ marginTop: 0 }}>
        Price negotiation
      </p>

      <div className="negotiation-thread">
        {offers.map((offer) => {
          const isYours = offer.proposed_by === "client";
          return (
            <div key={offer.id} className={`offer-bubble ${isYours ? "mine" : "theirs"}`}>
              <div className="offer-bubble-head">
                <span>{isYours ? "Your offer" : "Nimia Studio"}</span>
                <span>{formatRelative(offer.created_at)}</span>
              </div>
              <p className="offer-amount">${offer.amount_usd.toLocaleString("en-US")}</p>
              {offer.message && <p className="offer-message">{offer.message}</p>}
            </div>
          );
        })}
      </div>

      {finalPriceUsd != null && (
        <div className="agreed-price-row">
          <span>Agreed Price</span>
          <span>${finalPriceUsd.toLocaleString("en-US")}</span>
        </div>
      )}

      {error && (
        <p className="error-text" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      {actionTaken && (
        <p style={{ marginTop: 12, fontSize: 13, color: "#34d399" }}>{actionTaken}</p>
      )}
      {accepted && (
        <a className="link-row" href="/orders" style={{ marginTop: 8 }}>
          <span>Go to Orders to complete payment</span>
          <span className="arrow">→</span>
        </a>
      )}

      {canRespond && !actionTaken && (
        <div className="negotiation-actions">
          <div className="negotiation-buttons">
            <button
              type="button"
              disabled={isPending}
              className="cta-button"
              onClick={() =>
                run(
                  () => acceptNegotiationOfferAction(orderId),
                  `Accepted at $${latestOffer!.amount_usd.toLocaleString("en-US")}. Head to Orders to pay.`,
                  true,
                )
              }
            >
              Accept ${latestOffer!.amount_usd.toLocaleString("en-US")}
            </button>
            <button
              type="button"
              disabled={isPending}
              className="cta-button secondary"
              onClick={() => run(() => rejectNegotiationOfferAction(orderId), "Order rejected.")}
            >
              Reject
            </button>
          </div>

          <div className="copy-row" style={{ marginTop: 10 }}>
            <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>$</span>
            <input
              type="number"
              min={1}
              inputMode="decimal"
              placeholder="Send a counter offer"
              value={counterOffer}
              onChange={(event) => setCounterOffer(event.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={isPending || !counterOffer.trim()}
              onClick={() => {
                const amount = Number(counterOffer.trim());
                if (!counterOffer.trim() || Number.isNaN(amount) || amount <= 0) {
                  setError("Enter a valid counter offer amount.");
                  return;
                }
                run(() => sendClientCounterOfferAction(orderId, amount), "Counter offer sent.");
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
