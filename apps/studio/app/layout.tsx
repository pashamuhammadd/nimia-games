import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Sora (body) + Plus Jakarta Sans (headings) for the public/marketing
// pages (navbar, landing hero, /services, /login, /register). Only
// opted into by public-page components explicitly (see PublicNavbar.tsx
// / page.tsx); the dashboard keeps its own plain system-font stack from
// globals.css untouched, since it's a working tool, not a marketing
// surface.
//
// Swapped Rajdhani -> Plus Jakarta Sans for headings (29 Juli 2026, per
// user feedback: Rajdhani's condensed all-caps-leaning letterforms read
// as too "kaku"/rigid for a friendly brand). Plus Jakarta Sans keeps a
// bold, confident display weight while staying warm and easy to read,
// closer in spirit to Sora so headings and body don't clash.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["600", "700", "800"],
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
    <html lang="en" className={`${sora.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
