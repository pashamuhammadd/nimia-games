import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import * as React from "react";

// Design rationale (Tahap 4, prepared early while waiting on Resend domain
// verification): one shared layout is used by every transactional email
// template so the branding stays consistent (header logo, crimson accent,
// contact footer) without duplicating markup per template. Colors & fonts
// are deliberately written as literal HEX values/font stacks (not CSS
// variables like on the web) because most email clients (Outlook, Gmail
// app) don't support custom properties or Tailwind's @theme.
export const BRAND = {
  maroon: "#2b0a1a",
  crimson: "#c1124d",
  crimsonHover: "#a30f42",
  pink: "#ff4d8d",
  background: "#faf7f8",
  surface: "#ffffff",
  foreground: "#1a0f14",
  muted: "#7a6870",
  border: "#ecdfe4",
} as const;

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Header lockup (mark + "STUDIO / NIMIA GAMES" two-line wordmark), same
// asset used in apps/studio's navbar/sidebar
// (apps/studio/public/nimia-studio-lockup.svg), added 29 Juli 2026 to
// replace the old separate logo+wordmark pair once the Studio-specific
// lockup was designed. Hosted on apps/www (the only app with a static
// /public folder reliably reachable by every email client — the studio
// domain is noindex'd) as a PRE-RASTERIZED PNG, not the SVG directly:
// Outlook desktop doesn't render <img src="*.svg"> at all. Rendered at
// 3x the display size below for a crisp look on retina screens.
export const STUDIO_LOCKUP_URL = "https://www.nimiagames.com/nimia-studio-lockup-email.png";
export const SITE_URL = "https://www.nimiagames.com";
// Updated 19 Agustus 2026 — Nimia Studio's 5 real inboxes each got an
// assigned purpose (business@/pasha@/billing@/support@/team@nimiastudio.com,
// see apps/*/lib/email.tsx for the per-template FROM addresses). This is
// the "questions? reach us at..." line shown at the bottom of EVERY
// transactional email regardless of which address it was sent from, so it
// points at business@ — the main/default inbox, not any single template's
// specific FROM.
export const CONTACT_EMAIL = "business@nimiastudio.com";

export const ctaButtonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: BRAND.crimson,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 28px",
  borderRadius: 8,
};

type EmailLayoutProps = {
  previewText: string;
  children: React.ReactNode;
};

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: BRAND.background,
          margin: 0,
          padding: "32px 0",
          fontFamily: FONT_STACK,
        }}
      >
        <Container style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
          <Section style={{ textAlign: "center", padding: "0 0 28px" }}>
            {/* A table + align="center" (not margin:auto) is used here on
                purpose — it's the most reliable way to center a table
                element in Outlook desktop. */}
            <table role="presentation" align="center" cellPadding={0} cellSpacing={0} border={0}>
              <tbody>
                <tr>
                  <td>
                    <Img
                      src={STUDIO_LOCKUP_URL}
                      width={230}
                      height={75}
                      alt="Nimia Games Studio"
                      style={{ display: "block" }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 12,
              border: `1px solid ${BRAND.border}`,
              overflow: "hidden",
            }}
          >
            <Section style={{ backgroundColor: BRAND.maroon, padding: "4px", lineHeight: "4px" }}>
              &nbsp;
            </Section>
            <Section style={{ padding: "32px 32px 24px" }}>{children}</Section>
          </Section>

          <Section style={{ padding: "24px 8px 0", textAlign: "center" }}>
            <Text style={{ color: BRAND.muted, fontSize: 12, lineHeight: "18px", margin: "0 0 4px" }}>
              Nimia Games &middot; Indie game development studio
            </Text>
            <Text style={{ color: BRAND.muted, fontSize: 12, lineHeight: "18px", margin: 0 }}>
              Questions? Reply to this email or reach us at{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`} style={{ color: BRAND.crimson }}>
                {CONTACT_EMAIL}
              </Link>
            </Text>
            <Text style={{ color: BRAND.muted, fontSize: 12, lineHeight: "18px", margin: "12px 0 0" }}>
              <Link href={SITE_URL} style={{ color: BRAND.muted, textDecoration: "underline" }}>
                nimiagames.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
