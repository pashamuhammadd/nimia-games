import { games } from "@/data/games";

export default function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nimia Games",
    url: "https://nimiagames.com",
    logo: "https://nimiagames.com/logo.png",
    image: "https://nimiagames.com/logo.png",
    founder: {
      "@type": "Person",
      name: "Pasha Muhammad",
      url: "https://pashamuhammad.me",
    },
    description:
      "Nimia Games is an independent creative studio building original games, animation, digital assets, and interactive experiences for the Solana ecosystem.",
    sameAs: ["https://nimiastudio.com", "https://lifetopiaworld.io"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nimia Games",
    url: "https://nimiagames.com",
    description:
      "Independent Game Development, Animation & Digital Assets Studio.",
  };

  const videoGameSchemas = games.map((game) => ({
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    url: game.externalUrl ?? `https://nimiagames.com/games/${game.slug}`,
    applicationCategory: "Game",
    operatingSystem: game.platforms.join(", "),
    genre: [game.genre],
    creator: {
      "@type": "Organization",
      name: "Nimia Games",
      url: "https://nimiagames.com",
    },
    description: game.description,
  }));

  const schemas = [organizationSchema, websiteSchema, ...videoGameSchemas];

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
