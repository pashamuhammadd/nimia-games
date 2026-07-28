import type { Metadata } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/seo/JsonLd";
import Navbar from "@/components/layout/Navbar";
import AnimatedBackground from "@/components/flow/AnimatedBackground";

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
  metadataBase: new URL("https://nimiagames.com"),

  title: {
    default: "Nimia Games - Game Development, Animation & Digital Assets Studio",
    template: "%s | Nimia Games",
  },

  description:
    "Nimia Games is an independent creative studio building original games, animation, digital assets, and interactive experiences for players, communities, and the Solana ecosystem.",

  keywords: [
    "Nimia Games",
    "game studio",
    "game development",
    "animation studio",
    "digital assets",
    "creative studio",
    "Lifetopia World",
    "Solana games",
    "Web3 games",
    "Indonesia game studio",
  ],

  applicationName: "Nimia Games",
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
    canonical: "https://nimiagames.com",
  },

  openGraph: {
    title: "Nimia Games: Game Development, Animation & Digital Assets Studio",
    description:
      "Independent creative studio building original games, animation, digital assets, and interactive experiences for the Solana ecosystem and beyond.",
    url: "https://nimiagames.com",
    siteName: "Nimia Games",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nimia Games: Game Development, Animation & Digital Assets Studio",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Nimia Games: Game Development, Animation & Digital Assets Studio",
    description:
      "Independent creative studio building original games, animation, digital assets, and interactive experiences for the Solana ecosystem and beyond.",
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
        <AnimatedBackground />
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
