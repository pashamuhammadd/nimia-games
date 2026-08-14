// Site-wide structured data for nimiastudio.com (SEO fix, 10 Agustus 2026;
// domain migrated from studio.nimiagames.com to nimiastudio.com, 14 Agustus
// 2026) — same pattern as apps/www/components/seo/JsonLd.tsx, adapted for
// the studio subdomain: a "ProfessionalService" entity (this app sells
// commissioned creative work, unlike www which is the company profile /
// game portfolio site) plus a WebSite entry. `sameAs` links back to
// nimiagames.com, mirroring the link www's own JsonLd already declares in
// the other direction (its Organization schema's `sameAs` already includes
// "https://nimiastudio.com") — so search engines can connect the two
// as the same brand/entity from both sides.
export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Nimia Studio",
    url: "https://nimiastudio.com",
    logo: "https://nimiastudio.com/nimia-mark-hero.png",
    image: "https://nimiastudio.com/og-image.png",
    description:
      "Nimia Studio turns your ideas into professional, polished animation, games, and digital assets — from concept to delivery, tracked in your own project dashboard.",
    areaServed: "Worldwide",
    sameAs: ["https://nimiagames.com"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nimia Studio",
    url: "https://nimiastudio.com",
    description:
      "Animation, game development, and digital assets studio with a client project dashboard.",
  };

  const schemas = [organizationSchema, websiteSchema];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}
    </>
  );
}
