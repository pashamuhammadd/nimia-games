import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimia Studio",
  description:
    "Client portal, order system, project management, and invoicing for Nimia Games.",
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
