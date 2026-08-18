import type { Metadata, Viewport } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { JsonLd } from "./components/seo/JsonLd";

// Same two fonts, same variable names, as apps/studio/apps/www — keeps
// portfolio.nimiastudio.com reading as the same brand as the rest of the
// studio's sites rather than drifting on its own.
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.nimiastudio.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nimia Studio — Animation Portfolio",
    template: "%s | Nimia Studio Portfolio",
  },
  description:
    "Explore Nimia Studio's animation portfolio, including 2D animation, cinematic videos, GIFs, game trailers, promotional animation, and more.",
  applicationName: "Nimia Studio Portfolio",
  authors: [{ name: "Nimia Games", url: "https://nimiagames.com" }],
  creator: "Nimia Games",
  publisher: "Nimia Games",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nimia Studio — Animation Portfolio",
    description:
      "A curated collection of animations, game trailers, and digital experiences crafted by Nimia Studio.",
    url: SITE_URL,
    siteName: "Nimia Studio Portfolio",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Nimia Studio — Animation Portfolio" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nimia Studio — Animation Portfolio",
    description:
      "A curated collection of animations, game trailers, and digital experiences crafted by Nimia Studio.",
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

export const viewport: Viewport = {
  themeColor: "#0a0407",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${rajdhani.variable}`}>
      <body>
        <JsonLd />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
