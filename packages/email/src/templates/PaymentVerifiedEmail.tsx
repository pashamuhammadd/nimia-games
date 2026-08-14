import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

// Added 4 Agustus 2026 (P0.2 audit follow-up). Sent from apps/admin's
// verifyPaymentAction (app/(protected)/orders/actions.ts) right after an
// order flips from 'payment_submitted' to 'paid' — the client submitted a
// tx hash via apps/studio's PaymentPanel and staff manually confirmed it
// against a block explorer (see payment-actions.ts's comments for why that
// check is manual). Until this template, that confirmation only ever
// showed up as a status change in the dashboard — no notification at all.
export type PaymentVerifiedEmailProps = {
  clientName: string;
  serviceName: string;
  orderId: string;
  amountUsd: number;
  network: string;
  currency: string;
  dashboardUrl: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function PaymentVerifiedEmail({
  clientName,
  serviceName,
  orderId,
  amountUsd,
  network,
  currency,
  dashboardUrl,
}: PaymentVerifiedEmailProps) {
  return (
    <EmailLayout previewText={`Payment verified for your ${serviceName} order`}>
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        Payment verified ✅
      </Heading>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        We&apos;ve verified your payment for <strong>{serviceName}</strong>.
        Your project is now moving into production — we&apos;ll keep you
        updated from your dashboard.
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
          Amount paid
        </Text>
        <Text style={{ ...textStyle, margin: 0, fontSize: 18, fontWeight: 700 }}>
          ${amountUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
          <span style={{ fontSize: 12, fontWeight: 400, color: BRAND.muted }}>
            ({currency} on {network})
          </span>
        </Text>
      </Section>

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={dashboardUrl} style={ctaButtonStyle}>
          View your order
        </Button>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Questions about your project? Just reply to this email.
      </Text>
    </EmailLayout>
  );
}

PaymentVerifiedEmail.PreviewProps = {
  clientName: "Pasha",
  serviceName: "2D Platformer Game Development",
  orderId: "ORD-8F3A2C10",
  amountUsd: 2500,
  network: "Tron",
  currency: "USDT",
  dashboardUrl: "https://app.nimiastudio.com/dashboard/orders",
} satisfies PaymentVerifiedEmailProps;

export default PaymentVerifiedEmail;
