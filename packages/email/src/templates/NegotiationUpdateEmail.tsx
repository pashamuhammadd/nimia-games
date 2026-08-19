import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

// Added 4 Agustus 2026 (P0.2 audit follow-up — "email transaksional belum
// jalan"). Covers the two moments in apps/admin's negotiation flow
// (acceptNegotiationOfferAction / sendCounterOfferAction, see
// app/(protected)/orders/actions.ts) where a client is actually waiting on
// a reply from Nimia Studio: their offer got accepted (ready to pay) or
// countered (needs their decision next). One template, two copy variants —
// same shape of information either way (order + amount), just different
// heading/CTA. Rejecting a negotiation is intentionally NOT covered here;
// it shares rejectOrderAction with plain (non-negotiated) order rejection,
// which has no price to show and would need its own copy — left for a
// follow-up rather than forcing mismatched copy into this template.
export type NegotiationUpdateEmailProps = {
  clientName: string;
  serviceName: string;
  orderId: string;
  kind: "accepted" | "counter";
  amountUsd: number;
  message?: string | null;
  dashboardUrl: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

function formatUsd(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function NegotiationUpdateEmail({
  clientName,
  serviceName,
  orderId,
  kind,
  amountUsd,
  message,
  dashboardUrl,
}: NegotiationUpdateEmailProps) {
  const isAccepted = kind === "accepted";

  return (
    // previewText is the hidden preheader shown after the subject in the
    // inbox list — fixed 19 Agustus 2026 (user report of subject/preview
    // looking duplicated in Gmail). This used to just restate the subject
    // ("Your offer ... was accepted — ready to pay" right after a subject
    // that already says "... was accepted"); now it adds the actual price
    // (accepted) or a clear next action (counter) instead.
    <EmailLayout
      previewText={
        isAccepted
          ? `Your price is locked in at ${formatUsd(amountUsd)} — pay whenever you're ready.`
          : `Take a look and accept, counter again, or decline from your dashboard.`
      }
    >
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        {isAccepted ? "Your offer was accepted 🎉" : "We've sent a counter offer"}
      </Heading>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        {isAccepted ? (
          <>
            Good news — Nimia Studio accepted your offer for{" "}
            <strong>{serviceName}</strong>. The agreed price is now set and
            your order is ready for payment.
          </>
        ) : (
          <>
            Nimia Studio reviewed your offer for <strong>{serviceName}</strong>{" "}
            and sent back a counter offer. Take a look and respond from your
            dashboard whenever you&apos;re ready.
          </>
        )}
      </Text>

      <Section
        style={{
          backgroundColor: BRAND.background,
          border: `1px solid ${BRAND.border}`,
          borderRadius: 8,
          padding: "16px 20px",
          margin: "0 0 20px",
        }}
      >
        <Text style={{ ...textStyle, margin: "0 0 2px", fontSize: 12, color: BRAND.muted }}>
          Order reference
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 12px", fontFamily: "monospace", fontSize: 13 }}>
          {orderId}
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 2px", fontSize: 12, color: BRAND.muted }}>
          {isAccepted ? "Agreed price" : "New offer"}
        </Text>
        <Text style={{ ...textStyle, margin: 0, fontSize: 18, fontWeight: 700 }}>
          {formatUsd(amountUsd)}
        </Text>
      </Section>

      {!isAccepted && message ? (
        <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, fontStyle: "italic" }}>
          &ldquo;{message}&rdquo;
        </Text>
      ) : null}

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={dashboardUrl} style={ctaButtonStyle}>
          {isAccepted ? "Pay for your order" : "Review the offer"}
        </Button>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        {isAccepted
          ? "You can pay with any of the supported crypto networks directly from your dashboard."
          : "You can accept, counter again, or decline from your dashboard."}
      </Text>
    </EmailLayout>
  );
}

// Sample data for React Email's dev server (`npm run dev --workspace=@nimia/email`).
NegotiationUpdateEmail.PreviewProps = {
  clientName: "Pasha",
  serviceName: "2D Platformer Game Development",
  orderId: "ORD-8F3A2C10",
  kind: "accepted",
  amountUsd: 2500,
  message: null,
  dashboardUrl: "https://app.nimiastudio.com/dashboard/orders",
} satisfies NegotiationUpdateEmailProps;

export default NegotiationUpdateEmail;
