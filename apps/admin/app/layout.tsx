import type { Metadata } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";

// Same fonts/variable names as apps/studio and apps/www — Sora (body) +
// Rajdhani (display/headings) — so admin.nimiagames.com reads as the same
// brand instead of drifting to a generic system-font admin tool look.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nimia Admin",
    template: "%s | Nimia Admin",
  },
  description:
    "Internal admin panel for Nimia Games — orders, clients, projects, invoices, and services.",
  robots: {
    // Internal, staff-only tool — never meant to be indexed.
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${rajdhani.variable}`}>
      <body>{children}</body>
    </html>
  );
}
