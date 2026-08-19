import { Resend } from "resend";
import { OrderReceivedEmail, type OrderReceivedEmailProps } from "@nimia/email";

// Added 4 Agustus 2026 (P0.2 audit follow-up — "email transaksional belum
// jalan"). Centralizes Resend usage for apps/studio so every server action
// that needs to send a transactional email shares one "from" address and
// one non-throwing error path. An email failing to send should NEVER take
// down the request that triggered it — by the time any of these are
// called, the actual DB write (e.g. the order itself) has already
// succeeded, so a Resend hiccup is logged and swallowed, not thrown.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Updated 19 Agustus 2026 — Nimia Studio now has 5 real inboxes
// (business@/pasha@/billing@/support@/team@nimiastudio.com), each with an
// assigned purpose per the user's own decision. This file only sends
// OrderReceivedEmail ("We've received your order"), which is exactly the
// "tim Nimia sudah menerima orderan klien" notification team@ was set up
// for — so it goes out from team@, not the old shared contact@ address.
// RESEND_FROM_EMAIL still overrides this for local/staging testing; make
// sure nimiastudio.com stays verified (SPF/DKIM) in the Resend dashboard
// for whichever address is actually used.
const FROM = `Nimia Studio Team <${process.env.RESEND_FROM_EMAIL ?? "team@nimiastudio.com"}>`;

async function send(to: string, subject: string, react: React.ReactElement): Promise<boolean> {
  if (!resend) {
    // Missing env var, not a real failure — logged so it's visible in
    // Vercel function logs instead of failing silently forever.
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

export async function sendOrderReceivedEmail(
  to: string,
  props: OrderReceivedEmailProps,
): Promise<boolean> {
  return send(to, `We've received your ${props.serviceName} order`, <OrderReceivedEmail {...props} />);
}
