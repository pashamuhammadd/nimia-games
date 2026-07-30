import type { Metadata } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";

// Sora (body) + Rajdhani (headings) — matches apps/www/app/layout.tsx
// exactly (same fonts, same weights, same variable names), so the
// public/marketing pages here (navbar, landing hero, /services, /login,
// /register) read as the same brand as www instead of drifting.
//
// Note: this briefly used Plus Jakarta Sans instead of Rajdhani (29 Juli
// 2026, per feedback that Rajdhani felt too "kaku"/rigid) — reverted the
// same day (per user request) once www and studio were compared side by
// side and www's Rajdhani look was preferred. Only opted into by
// public-page components explicitly (see PublicNavbar.tsx / page.tsx);
// the dashboard keeps its own plain system-font stack from globals.css
// untouched, since it's a working tool, not a marketing surface.
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
    default: "Nimia Studio",
    template: "%s | Nimia Studio",
  },
  description:
    "Client portal, order system, project management, and invoicing for Nimia Games.",
  robots: {
    // Internal client dashboard — never meant to be indexed.
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
