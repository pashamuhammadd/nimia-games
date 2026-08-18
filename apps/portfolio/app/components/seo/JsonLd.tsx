const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.nimiastudio.com";
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";

// Same pattern as apps/studio's JsonLd.tsx — a WebSite entity plus
// `sameAs` linking back to nimiastudio.com so search engines connect this
// subdomain to the main studio brand.
export function JsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nimia Studio Portfolio",
    url: SITE_URL,
    description:
      "Explore Nimia Studio's animation portfolio, including 2D animation, cinematic videos, GIFs, game trailers, and promotional animation.",
    publisher: {
      "@type": "Organization",
      name: "Nimia Studio",
      url: STUDIO_URL,
    },
    sameAs: [STUDIO_URL],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
    />
  );
}
