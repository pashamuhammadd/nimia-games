"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { ChatMessage, CreativeAgentPaymentMethod, StructuredProjectData, UploadedAsset } from "../types";
import { CreativeInput } from "./CreativeInput";
import { ConversationThread } from "./ConversationThread";
import { AttachFilesControl } from "./AttachFilesControl";
import { CreativeBriefCard, type CreativeAgentOrderIntent } from "./CreativeBriefCard";
import { submitCreativeAgentOrderAction } from "../state/submit-creative-agent-order-action";

const GENERIC_ERROR_MESSAGE = "Something went wrong reaching Nimia Creative Agent. Please try again.";

function nowIso() {
  return new Date().toISOString();
}

// The full Nimia Creative Agent conversation, on its own dedicated page
// (P8, 13 Agustus 2026 — per user feedback after trying the original
// morph-in-place homepage version: "kurang oke... kurang lega"). This is
// almost entirely the state machine that used to live in
// CreativeAgentSection.tsx before the split — see that file's own comment
// for the new division of labor: the homepage now only owns the very
// first message (idle hero -> POST -> redirect here), and this component
// owns everything from the first reply onward.
//
// Unlike the old inline version, restoring on mount here isn't just a
// login-redirect recovery path — it's the PRIMARY way this page gets its
// data. The homepage already sent the first message and set the session
// cookie before navigating here; this component's whole job on mount is
// to fetch that session back and render it.
export function CreativeAgentWorkspace() {
  const router = useRouter();
  const [initializing, setInitializing] = React.useState(true);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [lastMessageIsNotice, setLastMessageIsNotice] = React.useState(false);
  const [quickReplies, setQuickReplies] = React.useState<string[] | null>(null);
  const [understanding, setUnderstanding] = React.useState<StructuredProjectData | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [confirmedUnderstanding, setConfirmedUnderstanding] = React.useState<StructuredProjectData | null>(null);
  const [uploadedAssets, setUploadedAssets] = React.useState<UploadedAsset[]>([]);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  // Payment Method (16 Agustus 2026, Fase 6) — same "local component state
  // only, not persisted server-side or restored on reload" posture
  // agreedToTerms/negotiationOffer right below already have (see this
  // component's own restore-on-mount effect above, which never touches
  // either) — a page reload after confirming the brief already loses those
  // two, so this isn't a new limitation, just a third field with the same
  // one.
  const [paymentMethod, setPaymentMethod] = React.useState<CreativeAgentPaymentMethod | null>(null);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [negotiationOffer, setNegotiationOffer] = React.useState("");
  const [submittingOrder, setSubmittingOrder] = React.useState(false);
  const [orderSubmitError, setOrderSubmitError] = React.useState<string | null>(null);
  const restoredRef = React.useRef(false);

  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    (async () => {
      try {
        const response = await fetch("/api/creative-agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "restore" }),
        });
        const data = await response.json();

        if (!data.ok || !Array.isArray(data.messages) || data.messages.length === 0) {
          // Nothing to show — a direct visit to this URL with no chat ever
          // started. Send them back to the one place a conversation can
          // begin instead of showing an empty page.
          router.replace("/");
          return;
        }

        setMessages(data.messages as ChatMessage[]);
        setUploadedAssets((data.uploadedAssets as UploadedAsset[]) ?? []);
        setOrderId((data.orderId as string | null) ?? null);
        if (data.status === "confirmed") {
          setConfirmedUnderstanding(data.structuredData as StructuredProjectData);
          setConfirmed(true);
        }
      } catch {
        router.replace("/");
        return;
      } finally {
        setInitializing(false);
      }
    })();
  }, [router]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed, at: nowIso() }]);
    setDraft("");
    setQuickReplies(null);
    setUnderstanding(null);
    setLastMessageIsNotice(false);
    setLoading(true);

    try {
      const response = await fetch("/api/creative-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "message", text: trimmed }),
      });
      const data = await response.json();

      if (data.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, at: nowIso() }]);
        setQuickReplies(data.quickReplies ?? null);
        setUnderstanding(data.readyToConfirm ? (data.understanding as StructuredProjectData) : null);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reason ?? GENERIC_ERROR_MESSAGE, at: nowIso() }]);
        setLastMessageIsNotice(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: GENERIC_ERROR_MESSAGE, at: nowIso() }]);
      setLastMessageIsNotice(true);
    } finally {
      setLoading(false);
    }
  }

  function handleWantToChange() {
    setUnderstanding(null);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const response = await fetch("/api/creative-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "confirm" }),
      });
      const data = await response.json();

      if (data.ok) {
        setConfirmedUnderstanding(data.understanding as StructuredProjectData);
        setUnderstanding(null);
        setQuickReplies(null);
        setConfirmed(true);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reason ?? GENERIC_ERROR_MESSAGE, at: nowIso() }]);
        setLastMessageIsNotice(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: GENERIC_ERROR_MESSAGE, at: nowIso() }]);
      setLastMessageIsNotice(true);
    } finally {
      setConfirming(false);
    }
  }

  async function handleSubmitOrder(intent: CreativeAgentOrderIntent) {
    // Payment Method (16 Agustus 2026, Fase 6) — same guard every other
    // order path's submit() already has (see modules/order/state/use-
    // order-wizard.ts's identical check): a client-side nicety so a
    // visitor doesn't wait on a round trip to find out. The Submit/
    // Negotiate buttons are already disabled without a selection (see
    // CreativeBriefCard), so this should be unreachable in practice — this
    // is defense-in-depth, not the primary gate. submitCreativeAgentOrderAction
    // re-validates it server-side too, which IS the real gate.
    if (!paymentMethod) {
      setOrderSubmitError("Choose a payment method before submitting.");
      return;
    }

    setSubmittingOrder(true);
    setOrderSubmitError(null);
    try {
      const result = await submitCreativeAgentOrderAction({
        intent,
        paymentMethod,
        negotiationOfferUsd: negotiationOffer,
        agreedToTerms,
      });

      if (result.ok) {
        setOrderId(result.orderId);
        return;
      }

      if (result.requiresAuth) {
        // Mirrors modules/order/state/use-order-wizard.ts's own redirect —
        // the conversation survives it via the restore effect above, same
        // reasoning as before the page split. redirectedFrom now points
        // here instead of "/", so the client lands straight back on their
        // brief instead of the homepage.
        router.push(`/login?redirectedFrom=${encodeURIComponent("/creative-agent")}`);
        return;
      }

      setOrderSubmitError(result.error);
    } catch {
      setOrderSubmitError("Something went wrong submitting your order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  }

  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--nimia-gold)]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--nimia-muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to home
      </Link>

      <p className="nimia-font-display mb-4 mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--nimia-gold)]">
        Nimia Creative Agent
      </p>

      <div className="min-h-[55vh] rounded-3xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)]/60 p-4 sm:p-6">
        <ConversationThread
          messages={messages}
          loading={loading}
          lastMessageIsNotice={lastMessageIsNotice}
          quickReplies={quickReplies}
          onQuickReply={(option) => submitMessage(option)}
          understanding={understanding}
          onConfirm={handleConfirm}
          onWantToChange={handleWantToChange}
          confirming={confirming}
        />

        {confirmed && confirmedUnderstanding ? (
          <div className="mt-4">
            <CreativeBriefCard
              understanding={confirmedUnderstanding}
              uploadedAssets={uploadedAssets}
              orderId={orderId}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              agreedToTerms={agreedToTerms}
              onAgreedToTermsChange={setAgreedToTerms}
              negotiationOffer={negotiationOffer}
              onNegotiationOfferChange={setNegotiationOffer}
              onSubmit={handleSubmitOrder}
              submitting={submittingOrder}
              submitError={orderSubmitError}
            />
          </div>
        ) : null}
      </div>

      {!confirmed ? (
        <div className="mt-4">
          <AttachFilesControl uploadedAssets={uploadedAssets} onFilesAttached={setUploadedAssets} disabled={loading} />
          <CreativeInput
            variant="composer"
            value={draft}
            onChange={setDraft}
            onSubmit={() => submitMessage(draft)}
            placeholder="Type your answer..."
            disabled={loading}
            loading={loading}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}
