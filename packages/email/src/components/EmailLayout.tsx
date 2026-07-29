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

// Logo & wordmark are hosted on apps/www (the only app with a static
// /public folder) — email clients can't load assets from the noindex'd
// studio domain, so these are deliberately absolute URLs to www. Two PNGs
// separate from the ones used on the web:
// - logo-email.png: a tight crop of logo.png (the original has a lot of
//   transparent padding, which makes it look even smaller at small sizes).
// - nimia-games-wordmark-dark.png: the web wordmark SVG recolored from
//   white (built for www's dark background) to maroon/crimson so it reads
//   on the email's white card. Converted to PNG on purpose — Outlook
//   desktop doesn't render <img src="*.svg"> at all.
export const LOGO_URL = "https://www.nimiagames.com/logo-email.png";
export const WORDMARK_URL = "https://www.nimiagames.com/nimia-games-wordmark-dark.png";
export const SITE_URL = "https://www.nimiagames.com";
export const CONTACT_EMAIL = "contact@nimiagames.com";

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
                  <td style={{ verticalAlign: "middle", paddingRight: 10 }}>
                    <Img src={LOGO_URL} width={53} height={40} alt="" style={{ display: "block" }} />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Img
                      src={WORDMARK_URL}
                      width={257}
                      height={24}
                      alt="Nimia Games"
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
