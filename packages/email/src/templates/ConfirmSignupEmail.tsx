import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

// Design rationale: Supabase Auth mengirim email "Confirm signup" ini
// SENDIRI (bukan lewat server action / Resend kita) begitu ada yang
// register di studio.nimiagames.com — kontennya dikonfigurasi langsung di
// Supabase Dashboard > Authentication > Email Templates, bukan di-render
// dari kode Next.js. Komponen React ini ada supaya desainnya tetap satu
// sumber kebenaran (bisa di-preview lokal via `npm run dev`, sama kayak
// template lain di sini), tapi versi yang BENERAN dipakai Supabase adalah
// HTML statis di packages/email/supabase-templates/confirm-signup.html
// (lihat README) — karena Supabase butuh HTML mentah + variable Go-template
// ({{ .ConfirmationURL }}), bukan komponen React.
export type ConfirmSignupEmailProps = {
  /** Di Supabase, ini diisi otomatis dari {{ .ConfirmationURL }} */
  confirmationUrl: string;
  /** Di Supabase, ini diisi otomatis dari {{ .Email }} */
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
    <EmailLayout previewText="Konfirmasi email untuk aktifkan akun Nimia Games kamu">
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        Satu langkah lagi &mdash; konfirmasi email kamu
      </Heading>

      <Text style={textStyle}>Halo,</Text>

      <Text style={textStyle}>
        Terima kasih sudah mendaftar di <strong>studio.nimiagames.com</strong>{" "}
        dengan email <strong>{email}</strong>. Klik tombol di bawah untuk
        konfirmasi email dan aktifkan akun kamu.
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0 20px" }}>
        <Button href={confirmationUrl} style={ctaButtonStyle}>
          Konfirmasi email
        </Button>
      </Section>

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted }}>
        Kalau tombolnya tidak berfungsi, salin dan buka link ini di browser:
        <br />
        <span style={{ wordBreak: "break-all" }}>{confirmationUrl}</span>
      </Text>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Bukan kamu yang mendaftar? Abaikan saja email ini &mdash; akunnya
        tidak akan aktif tanpa konfirmasi.
      </Text>
    </EmailLayout>
  );
}

ConfirmSignupEmail.PreviewProps = {
  confirmationUrl: "https://studio.nimiagames.com/auth/confirm?token=preview-token",
  email: "klien@contoh.com",
} satisfies ConfirmSignupEmailProps;

export default ConfirmSignupEmail;
