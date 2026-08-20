import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { TelegramBootstrap } from "./components/TelegramBootstrap";
import { BottomNav } from "./components/BottomNav";

// This app only ever renders inside Telegram's own webview (opened via
// the bot's web_app buttons or a t.me/.../?startapp= link — see
// packages/telegram/src/keyboards.ts) — it's never meant to be indexed
// or land traffic from search, hence robots: noindex, unlike every other
// app in this monorepo which sets index: true.
export const metadata: Metadata = {
  title: "Nimia Studio",
  description: "Nimia Studio, Professional Game & Digital Production, in Telegram.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0407",
  width: "device-width",
  initialScale: 1,
  // viewportFit: "cover" is required for the safe-area insets
  // TelegramBootstrap.tsx reads to actually correspond to real notch/
  // home-indicator geometry rather than being clamped to 0 by the
  // browser — same requirement as any PWA using env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* beforeInteractive so Telegram.WebApp exists before any client
            component's useEffect (TelegramBootstrap, TelegramLinkGate)
            tries to read it. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramBootstrap />
        <main className="app-shell">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
