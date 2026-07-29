import { Button, Heading, Hr, Section, Text } from "react-email";
import * as React from "react";
import { BRAND, EmailLayout, ctaButtonStyle } from "../components/EmailLayout";

export type OrderReceivedEmailProps = {
  /** Nama lengkap klien, dari orders.full_name */
  clientName: string;
  /** Nama layanan yang dipesan, dari services.name */
  serviceName: string;
  /** Referensi pendek untuk ditunjukkan ke klien, mis. 8 karakter pertama orders.id */
  orderId: string;
  /** Sudah diformat jadi string (mis. "29 Juli 2026, 14.30 WIB") sebelum dikirim ke sini */
  submittedAt: string;
  /** orders.description — ditampilkan sebagai kutipan, dipotong kalau kepanjangan */
  description: string;
  /** Link ke halaman detail pesanan di studio dashboard */
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
    <EmailLayout previewText={`Pesanan ${serviceName} kamu sudah kami terima`}>
      <Heading style={{ color: BRAND.maroon, fontSize: 20, margin: "0 0 16px" }}>
        Pesanan kamu sudah kami terima 🎉
      </Heading>

      <Text style={textStyle}>Halo {clientName},</Text>

      <Text style={textStyle}>
        Terima kasih sudah mengirimkan pesanan untuk layanan{" "}
        <strong>{serviceName}</strong>. Tim Nimia Games akan meninjau detail
        yang kamu kirimkan dan menghubungi kamu kembali dengan penawaran
        harga &amp; estimasi pengerjaan dalam 1&ndash;2 hari kerja.
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
          Nomor referensi pesanan
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 12px", fontFamily: "monospace", fontSize: 13 }}>
          {orderId}
        </Text>
        <Text style={{ ...textStyle, margin: "0 0 2px", fontSize: 12, color: BRAND.muted }}>
          Dikirim pada
        </Text>
        <Text style={{ ...textStyle, margin: 0 }}>{submittedAt}</Text>
      </Section>

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, fontStyle: "italic" }}>
        &ldquo;{trimmedDescription}&rdquo;
      </Text>

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={dashboardUrl} style={ctaButtonStyle}>
          Lihat status pesanan
        </Button>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: "24px 0" }} />

      <Text style={{ ...textStyle, fontSize: 12, color: BRAND.muted, margin: 0 }}>
        Belum ada tagihan di tahap ini &mdash; kami akan mengirim penawaran
        harga terlebih dahulu sebelum mulai pengerjaan.
      </Text>
    </EmailLayout>
  );
}

// Data contoh untuk React Email's dev server (`npm run dev`) supaya template
// bisa di-preview tanpa perlu order sungguhan.
OrderReceivedEmail.PreviewProps = {
  clientName: "Pasha",
  serviceName: "2D Platformer Game Development",
  orderId: "ORD-8F3A2C10",
  submittedAt: "29 Juli 2026, 14.30 WIB",
  description:
    "Kami butuh game platformer 2D bergaya pixel art untuk kampanye promosi produk, durasi permainan sekitar 5-10 menit, dengan 3 level.",
  dashboardUrl: "https://studio.nimiagames.com/dashboard/orders",
} satisfies OrderReceivedEmailProps;

export default OrderReceivedEmail;
