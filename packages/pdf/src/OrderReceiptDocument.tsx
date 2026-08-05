import * as React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// Brand tokens mirrored (as literal values, not imported) from
// packages/email/src/components/EmailLayout.tsx's BRAND — @react-pdf/renderer's
// <Text>/<View>/<Document> are a completely different primitive set from
// react-email's (own layout engine, own StyleSheet), so there's nothing
// real to share by importing @nimia/email here, just these 6 hex codes.
const BRAND = {
  maroon: "#2b0a1a",
  crimson: "#c1124d",
  background: "#faf7f8",
  foreground: "#1a0f14",
  muted: "#7a6870",
  border: "#ecdfe4",
};

// Same asset + URL as packages/email/src/components/EmailLayout.tsx's
// STUDIO_LOCKUP_URL — hosted on apps/www's /public (the only app with a
// static folder reliably reachable outside the app itself; apps/studio is
// behind auth). @react-pdf/renderer's <Image> can load a remote URL directly
// server-side (no browser/CORS involved, this renders in a Node process).
const LOGO_URL = "https://www.nimiagames.com/nimia-studio-lockup-email.png";

// Display labels for public.crypto_network — mirrors
// apps/studio/app/dashboard/orders/PaymentPanel.tsx's own copy so the same
// network reads the same everywhere, including on this PDF.
const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

// Explicit "-Bold" font family names (not `fontWeight: 700` on the base
// "Helvetica" family) — @react-pdf/renderer only synthesizes bold/italic
// automatically for fonts registered via Font.register(); the 14 built-in
// standard PDF fonts (Helvetica, Helvetica-Bold, Times-Roman, Courier, ...)
// need to be selected by name directly, so this avoids relying on numeric
// font-weight resolution against a font that was never registered.
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: BRAND.foreground,
  },
  logo: { width: 138, height: 45, marginBottom: 24, objectFit: "contain" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: BRAND.maroon, marginBottom: 2 },
  subtitle: { fontSize: 10, color: BRAND.muted, marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: BRAND.muted, fontSize: 9 },
  value: { fontSize: 10 },
  section: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: BRAND.background,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: BRAND.border,
  },
  sectionTitle: {
    fontSize: 9,
    color: BRAND.muted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  amountLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  amount: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND.crimson },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: BRAND.muted,
    fontSize: 8,
  },
});

export type OrderReceiptDocumentProps = {
  receiptNumber: string;
  issuedAt: string;
  billedToName: string;
  billedToEmail: string;
  serviceName: string;
  amountUsd: number;
  network: string | null;
  currency: string | null;
  txHash: string | null;
  verifiedAt: string | null;
  orderId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Single receipt document — issued once an order's payment is verified
// ('paid'). Deliberately just ONE document type, no separate pre-payment
// invoice/quotation PDF — see this migration's own header comment
// (0024_order_receipts.sql) for why.
export function OrderReceiptDocument({
  receiptNumber,
  issuedAt,
  billedToName,
  billedToEmail,
  serviceName,
  amountUsd,
  network,
  currency,
  txHash,
  verifiedAt,
  orderId,
}: OrderReceiptDocumentProps) {
  return (
    <Document title={`Receipt ${receiptNumber}`}>
      <Page size="A4" style={styles.page}>
        <Image src={LOGO_URL} style={styles.logo} />

        <Text style={styles.title}>Payment Receipt</Text>
        <Text style={styles.subtitle}>Nimia Studio · Indie game development studio</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Receipt #</Text>
          <Text style={styles.value}>{receiptNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Issued</Text>
          <Text style={styles.value}>{formatDate(issuedAt)}</Text>
        </View>
        <View style={{ ...styles.row, marginBottom: 20 }}>
          <Text style={styles.label}>Order reference</Text>
          <Text style={styles.value}>{orderId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <Text style={styles.value}>{billedToName}</Text>
          <Text style={{ ...styles.value, color: BRAND.muted }}>{billedToEmail}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.value}>{serviceName}</Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount paid</Text>
            <Text style={styles.amount}>
              ${amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          {network ? (
            <View style={styles.row}>
              <Text style={styles.label}>Network</Text>
              <Text style={styles.value}>{NETWORK_LABELS[network] ?? network}</Text>
            </View>
          ) : null}
          {currency ? (
            <View style={styles.row}>
              <Text style={styles.label}>Currency</Text>
              <Text style={styles.value}>{currency}</Text>
            </View>
          ) : null}
          {txHash ? (
            <View style={styles.row}>
              <Text style={styles.label}>Transaction hash</Text>
              <Text style={{ ...styles.value, fontSize: 8 }}>{txHash}</Text>
            </View>
          ) : null}
          {verifiedAt ? (
            <View style={styles.row}>
              <Text style={styles.label}>Verified</Text>
              <Text style={styles.value}>{formatDate(verifiedAt)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Nimia Games · Indie game development studio · contact@nimiagames.com · nimiagames.com
        </Text>
      </Page>
    </Document>
  );
}
