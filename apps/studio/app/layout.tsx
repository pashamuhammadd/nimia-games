import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
