import type { Metadata } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";
import { JsonLd } from "./components/seo/JsonLd";

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

// SEO fix, 10 Agustus 2026 — this used to set `robots: {index:false,
// follow:false}` sitewide, meant only to keep the internal /dashboard/*
// client portal out of Google. Next.js metadata inheritance meant every
// public marketing page (/, /services, /portfolio, /why-nimia,
// /how-to-start, /partners) inherited that same noindex directive too, so
// the entire public site — including the homepage — has been invisible to
// search engines since it launched. Fixed by flipping the sitewide
// default to indexable here and moving the noindex directive down to
// app/dashboard/layout.tsx instead, which now overrides it for that
// subtree only (a child's `robots` field fully replaces the parent's for
// everything under it, so this stays scoped correctly). Also added every
// site-wide SEO field this app never had (metadataBase, OpenGraph,
// Twitter card, keywords, JSON-LD) — same pattern as
// apps/www/app/layout.tsx, adapted for the studio subdomain and its own
// public/og-image.png (new asset, matches www's og-image.png style:
// same dark maroon gradient, same brand colors/fonts, studio-specific
// headline and lockup).
export const metadata: Metadata = {
  metadataBase: new URL("https://nimiastudio.com"),

  title: {
    default: "Nimia Studio - Animation, Game Development & Digital Assets",
    template: "%s | Nimia Studio",
  },

  description:
    "Nimia Studio turns your ideas into professional, polished animation, games, and digital assets. Get an instant estimate, track production, and pay securely — all from your own project dashboard.",

  keywords: [
    "Nimia Studio",
    "creative production studio",
    "animation studio",
    "game development studio",
    "digital assets",
    "hire animators",
    "commission game development",
    "2D animation service",
    "indie game outsourcing",
    "project dashboard",
  ],

  applicationName: "Nimia Studio",
  authors: [{ name: "Nimia Games", url: "https://nimiagames.com" }],
  creator: "Nimia Games",
  publisher: "Nimia Games",
  referrer: "origin-when-cross-origin",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Nimia Studio: Animation, Game Development & Digital Assets",
    description:
      "Professional animation, games, and digital assets, crafted end-to-end and tracked from your own project dashboard.",
    url: "https://nimiastudio.com",
    siteName: "Nimia Studio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nimia Studio: Animation, Game Development & Digital Assets",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Nimia Studio: Animation, Game Development & Digital Assets",
    description:
      "Professional animation, games, and digital assets, crafted end-to-end and tracked from your own project dashboard.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${rajdhani.variable}`}>
      <body>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
