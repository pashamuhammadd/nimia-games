import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

export type OrderReceivedEmailProps = {
  /** Client's full name, from orders.full_name */
  clientName: string;
  /** Name of the service ordered, from services.name */
  serviceName: string;
  /** Short reference to show the client, e.g. the first 8 chars of orders.id */
  orderId: string;
  /** Already formatted as a string (e.g. "July 29, 2026, 2:30 PM WIB") before being passed in */
  submittedAt: string;
  /** orders.description — shown as a quote, truncated if too long */
  description: string;
  /** Link to the order's detail page on the studio dashboard */
  dashboardUrl: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

const DESCRIPTION_PREVIEW_LIMIT = 220;

export function OrderReceivedEmail({
  clientName,
  serviceName,
  orderId,
  submittedAt,
  description,
  dashboardUrl,
}: OrderReceivedEmailProps) {
  const trimmedDescription =
    description.length > DESCRIPTION_PREVIEW_LIMIT
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LIMIT).trim()}…`
      : description;

  return (
    <EmailLayout previewText={`We've received your ${serviceName} order`}>
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        We&apos;ve received your order 🎉
      </Heading>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        Thanks for submitting your order for <strong>{serviceName}</strong>.
        The Nimia Games team will review the details you sent and get back
        to you with a quote and timeline estimate within 1&ndash;2 business
        days.
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
          Order reference number
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 12px", fontFamily: "monospace", fontSize: 13 }}>
          {orderId}
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 2px", fontSize: 12, color: BRAND.muted }}>
          Submitted on
        </Text>
        <Text style={{ ...textStyle, margin: 0 }}>{submittedAt}</Text>
      </Section>

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, fontStyle: "italic" }}>
        &ldquo;{trimmedDescription}&rdquo;
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={dashboardUrl} style={ctaButtonStyle}>
          View order status
        </Button>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        There&apos;s no charge at this stage &mdash; we&apos;ll send a quote
        first before starting any work.
      </Text>
    </EmailLayout>
  );
}

// Sample data for React Email's dev server (`npm run dev`) so the template
// can be previewed without a real order.
OrderReceivedEmail.PreviewProps = {
  clientName: "Pasha",
  serviceName: "2D Platformer Game Development",
  orderId: "ORD-8F3A2C10",
  submittedAt: "July 29, 2026, 2:30 PM WIB",
  description:
    "We need a pixel-art style 2D platformer game for a product promotion campaign, roughly 5-10 minutes of gameplay, with 3 levels.",
  dashboardUrl: "https://studio.nimiagames.com/dashboard/orders",
} satisfies OrderReceivedEmailProps;

export default OrderReceivedEmail;
