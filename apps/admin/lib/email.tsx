import { Resend } from "resend";
import {
  NegotiationUpdateEmail,
  type NegotiationUpdateEmailProps,
  PaymentVerifiedEmail,
  type PaymentVerifiedEmailProps,
  PaymentFlaggedEmail,
  type PaymentFlaggedEmailProps,
} from "@nimia/email";

// Added 4 Agustus 2026 (P0.2 audit follow-up — "email transaksional belum
// jalan"). Same pattern as apps/studio/lib/email.tsx: one place that knows
// RESEND_API_KEY/RESEND_FROM_EMAIL and swallows send failures (logged, not
// thrown) so a Resend hiccup never breaks the admin action that triggered
// it — by the time any of these are called, the actual `orders` UPDATE has
// already succeeded.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Fallback updated 14 Agustus 2026 (dashboard split) — see the same note in
// apps/studio/lib/email.tsx / apps/app/lib/email.tsx.
const FROM = `Nimia Studio <${process.env.RESEND_FROM_EMAIL ?? "contact@nimiastudio.com"}>`;

async function send(to: string, subject: string, react: React.ReactElement): Promise<boolean> {
  if (!resend) {
    console.error(`[email] RESEND_API_KEY is not set — skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, react });
    if (error) {
      console.error("[email] Resend returned an error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

export async function sendNegotiationUpdateEmail(
  to: string,
  props: NegotiationUpdateEmailProps,
): Promise<boolean> {
  const subject =
    props.kind === "accepted"
      ? `Your offer for ${props.serviceName} was accepted`
      : `Nimia Studio sent a counter offer for ${props.serviceName}`;
  return send(to, subject, <NegotiationUpdateEmail {...props} />);
}

export async function sendPaymentVerifiedEmail(
  to: string,
  props: PaymentVerifiedEmailProps,
): Promise<boolean> {
  return send(to, `Payment verified for your ${props.serviceName} order`, <PaymentVerifiedEmail {...props} />);
}

export async function sendPaymentFlaggedEmail(
  to: string,
  props: PaymentFlaggedEmailProps,
): Promise<boolean> {
  return send(to, `Your payment for ${props.serviceName} needs a second look`, <PaymentFlaggedEmail {...props} />);
}
