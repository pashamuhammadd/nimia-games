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
// Updated 19 Agustus 2026 — Nimia Studio now has 5 real inboxes
// (business@/pasha@/billing@/support@/team@nimiastudio.com), each with an
// assigned purpose per the user's own decision:
//   - support@ — "untuk verifikasi": PaymentVerifiedEmail/PaymentFlaggedEmail
//     are literally the payment-verification outcome, so they send from here.
//   - business@ — the main/default inbox: everything else this app sends
//     (negotiation offers/counter-offers) is general order correspondence,
//     not a verification or invoice, so it stays on the main address.
// RESEND_FROM_EMAIL is kept as a single override for local/staging testing
// only (applies to both — there's no need for two separate override vars
// for a dev convenience knob); in production each function below always
// uses its own real address regardless of that var.
const FROM_BUSINESS = `Nimia Studio <${process.env.RESEND_FROM_EMAIL ?? "business@nimiastudio.com"}>`;
const FROM_SUPPORT = `Nimia Studio Support <${process.env.RESEND_FROM_EMAIL ?? "support@nimiastudio.com"}>`;

async function send(from: string, to: string, subject: string, react: React.ReactElement): Promise<boolean> {
  if (!resend) {
    console.error(`[email] RESEND_API_KEY is not set — skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, react });
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
  return send(FROM_BUSINESS, to, subject, <NegotiationUpdateEmail {...props} />);
}

export async function sendPaymentVerifiedEmail(
  to: string,
  props: PaymentVerifiedEmailProps,
): Promise<boolean> {
  return send(FROM_SUPPORT, to, `Payment verified for your ${props.serviceName} order`, <PaymentVerifiedEmail {...props} />);
}

export async function sendPaymentFlaggedEmail(
  to: string,
  props: PaymentFlaggedEmailProps,
): Promise<boolean> {
  return send(
    FROM_SUPPORT,
    to,
    `Your payment for ${props.serviceName} needs a second look`,
    <PaymentFlaggedEmail {...props} />,
  );
}
