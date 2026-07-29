import { Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout } from "../components/EmailLayout";

// First email actually SENT through Resend in this codebase (29 Juli
// 2026) — everything before this (OrderReceivedEmail, ConfirmSignupEmail)
// was a template only / sent by Supabase Auth directly, see README. This
// one goes FROM the /contact form TO the studio's own inbox (notifying
// the team a visitor sent a message) — not to the visitor themselves, so
// there's no CTA button or "we'll be in touch" copy, just the raw
// message details for the team to read and reply to manually.
export type ContactMessageEmailProps = {
  name: string;
  email: string;
  message: string;
  submittedAt: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function ContactMessageEmail({ name, email, message, submittedAt }: ContactMessageEmailProps) {
  return (
    <EmailLayout previewText={`New contact form message from ${name}`}>
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        New message from the contact form
      </Heading>

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
          From
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 12px" }}>
          {name} &lt;{email}&gt;
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 2px", fontSize: 12, color: BRAND.muted }}>
          Sent on
        </Text>
        <Text style={{ ...textStyle, margin: 0 }}>{submittedAt}</Text>
      </Section>

      <Text style={{ ...textStyle, margin: "0 0 4px", fontSize: 12, color: BRAND.muted }}>
        Message
      </Text>
      <Text style={textStyle}>{message}</Text>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Reply directly to this email to respond to {name} — the Reply-To
        header is set to their address.
      </Text>
    </EmailLayout>
  );
}

// Sample data for React Email's dev server (`npm run dev`).
ContactMessageEmail.PreviewProps = {
  name: "Pasha",
  email: "pasha@example.com",
  message:
    "Hi, I'm interested in a custom 2D animation package for a product launch trailer. Could we set up a call this week?",
  submittedAt: "July 29, 2026, 2:30 PM WIB",
} satisfies ContactMessageEmailProps;

export default ContactMessageEmail;
