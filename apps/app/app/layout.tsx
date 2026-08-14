import type { Metadata } from "next";
import { Sora, Rajdhani } from "next/font/google";
import "./globals.css";

// apps/app — split out of apps/studio 14 Agustus 2026 (dashboard split, see
// [[studio_multi_app_split_plan]]). This app owns everything that requires
// or leads into a signed-in session: /login, /register, /order (the Project
// Configurator — reachable signed-out too, but its Submit step requires an
// account), and the whole /dashboard/* client portal. apps/studio keeps
// only the public marketing/funnel pages (/, /services, /portfolio,
// /why-nimia, /how-to-start, /partners) and now links here via
// NEXT_PUBLIC_APP_URL for anything that used to be a local route.
//
// Same fonts/variable names as apps/studio and apps/www (Sora body,
// Rajdhani headings) so this still reads as the same brand even though it's
// a different subdomain/deployment.
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

// Noindex sitewide by default — unlike apps/studio, nothing here is a
// marketing/funnel page meant to rank (login/register are utility pages,
// /order is a checkout flow reached via CTA not search, /dashboard/* is a
// private client portal). Matches apps/admin's posture. If /order ever
// needs to be indexable on its own, override `robots` in
// app/order/page.tsx's own metadata the same way app/dashboard/layout.tsx
// already overrides this for the dashboard subtree.
export const metadata: Metadata = {
  metadataBase: new URL("https://app.nimiastudio.com"),
  title: {
    default: "Nimia Studio — Client Portal",
    template: "%s | Nimia Studio",
  },
  description:
    "Sign in to configure a project, track production, and manage your Nimia Studio account.",
  robots: {
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
