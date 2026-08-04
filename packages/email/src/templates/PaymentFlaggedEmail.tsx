import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

// Added 4 Agustus 2026 (P0.2 audit follow-up). Sent from apps/admin's
// flagUnderpaidPaymentAction (app/(protected)/orders/actions.ts) when staff
// sends a submitted payment back to 'awaiting_payment' with a note (wrong
// amount, wrong network, tx not found, etc.) — mirrors the underpaidNote
// banner apps/studio's PaymentPanel already shows once the client opens
// their dashboard again, but until this template nothing told them to go
// look in the first place.
export type PaymentFlaggedEmailProps = {
  clientName: string;
  serviceName: string;
  orderId: string;
  note: string;
  dashboardUrl: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function PaymentFlaggedEmail({
  clientName,
  serviceName,
  orderId,
  note,
  dashboardUrl,
}: PaymentFlaggedEmailProps) {
  return (
    <EmailLayout previewText={`Your payment for ${serviceName} needs a second look`}>
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        Your payment needs a second look
      </Heading>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        We reviewed the payment you submitted for <strong>{serviceName}</strong>{" "}
        and it didn&apos;t fully match what we expected. Here&apos;s what our
        team noted:
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
        <Text style={{ ...textStyle, margin: 0, fontStyle: "italic" }}>&ldquo;{note}&rdquo;</Text>
      </Section>

      <Text style={textStyle}>
        Please double-check the details and resend your payment from your
        dashboard.
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={dashboardUrl} style={ctaButtonStyle}>
          Resend payment
        </Button>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Not sure what went wrong? Just reply to this email and we&apos;ll help.
      </Text>
    </EmailLayout>
  );
}

PaymentFlaggedEmail.PreviewProps = {
  clientName: "Pasha",
  serviceName: "2D Platformer Game Development",
  orderId: "ORD-8F3A2C10",
  note: "The amount received was slightly less than expected — please resend the difference or the full amount again.",
  dashboardUrl: "https://studio.nimiagames.com/dashboard/orders",
} satisfies PaymentFlaggedEmailProps;

export default PaymentFlaggedEmail;
