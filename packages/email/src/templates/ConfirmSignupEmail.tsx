import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

// Design rationale: Supabase Auth sends this "Confirm signup" email ITSELF
// (not through our server actions / Resend) as soon as someone registers on
// studio.nimiagames.com — its content is configured directly in the
// Supabase Dashboard > Authentication > Email Templates, not rendered from
// Next.js code. This React component exists so the design still has one
// source of truth (previewable locally via `npm run dev`, same as the other
// templates here), but the version Supabase actually sends is the static
// HTML at packages/email/supabase-templates/confirm-signup.html (see
// README) — because Supabase needs raw HTML + Go-template variables
// ({{ .ConfirmationURL }}), not a React component.
export type ConfirmSignupEmailProps = {
  /** In Supabase, this is filled automatically from {{ .ConfirmationURL }} */
  confirmationUrl: string;
  /** In Supabase, this is filled automatically from {{ .Email }} */
  email: string;
};

const textStyle: React.CSSProperties = {
  color: BRAND.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function ConfirmSignupEmail({ confirmationUrl, email }: ConfirmSignupEmailProps) {
  return (
    <EmailLayout previewText="Confirm your email to activate your Nimia Games account">
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        One more step &mdash; confirm your email
      </Heading>

      <Text style={textStyle}>Hi there,</Text>

      <Text style={textStyle}>
        Thanks for signing up at <strong>studio.nimiagames.com</strong> with
        the email <strong>{email}</strong>. Click the button below to
        confirm your email and activate your account.
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0 20px" }}>
        <Button href={confirmationUrl} style={ctaButtonStyle}>
          Confirm email
        </Button>
      </Section>

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all" }}>{confirmationUrl}</span>
      </Text>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Didn&apos;t sign up for this? Just ignore this email &mdash; the
        account won&apos;t be activated without confirmation.
      </Text>
    </EmailLayout>
  );
}

ConfirmSignupEmail.PreviewProps = {
  confirmationUrl: "https://studio.nimiagames.com/auth/confirm?token=preview-token",
  email: "client@example.com",
} satisfies ConfirmSignupEmailProps;

export default ConfirmSignupEmail;
