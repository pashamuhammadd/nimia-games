import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import * as React from "react";

// Design rationale (Tahap 4, disiapkan lebih awal sambil nunggu verifikasi
// domain Resend): satu layout dipakai semua template email transaksional
// supaya brand-nya konsisten (header logo, warna aksen crimson, footer
// kontak) tanpa menduplikasi markup di tiap template. Warna & font sengaja
// ditulis sebagai nilai HEX/font-stack langsung (bukan CSS variable seperti
// di web) karena sebagian besar email client (Outlook, Gmail app) tidak
// mendukung custom property atau Tailwind's @theme.
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

// Logo & wordmark di-host di apps/www (satu-satunya app yang punya /public
// statis) — email client tidak bisa memuat aset dari domain studio yang
// di-noindex, jadi sengaja pakai URL absolut ke www. Dua file PNG terpisah
// dari yang dipakai di web:
// - logo-email.png: crop rapat dari logo.png (versi asli banyak padding
//   transparan, jadi kalau ditampilkan kecil di email malah keliatan makin
//   kecil lagi).
// - nimia-games-wordmark-dark.png: rekoloring dari wordmark SVG di web
//   (aslinya putih untuk background gelap www) jadi maroon/crimson supaya
//   kebaca di kartu putih email. SVG sengaja dikonversi ke PNG karena
//   Outlook desktop tidak render <img src="*.svg"> sama sekali.
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
    <Html lang="id">
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
            {/* Table + align="center" (bukan margin:auto) sengaja dipakai di sini
                karena ini cara paling reliable buat nge-center elemen table di
                Outlook desktop. */}
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
              Nimia Games &middot; Studio pengembangan game indie
            </Text>
            <Text style={{ color: BRAND.muted, fontSize: 12, lineHeight: "18px", margin: 0 }}>
              Ada pertanyaan? Balas email ini atau hubungi{" "}
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
