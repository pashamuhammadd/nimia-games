export default function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nimia Games",
    url: "https://nimiagames.com",
    logo: "https://nimiagames.com/logo.png",
    founder: {
      "@type": "Person",
      name: "Pasha Muhammad",
      url: "https://pashamuhammad.me",
    },
    description:
      "Nimia Games is an independent creative studio building original games, animation, digital assets, and interactive experiences.",
    sameAs: [
      "https://studio.nimiagames.com",
      "https://lifetopiaworld.io"
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nimia Games",
    url: "https://nimiagames.com",
    description:
      "Independent Game Development, Animation & Digital Assets Studio.",
  };

  const videoGameSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Lifetopia World",
    url: "https://lifetopiaworld.io",
    applicationCategory: "Game",
    operatingSystem: "Web, Android, iOS",
    genre: ["Life Simulation", "Social Simulation", "Cozy Game"],
    creator: {
      "@type": "Organization",
      name: "Nimia Games",
      url: "https://nimiagames.com",
    },
    description:
      "Lifetopia World is a cozy life simulation game where players can farm, fish, cook, craft, trade, and connect with others in a charming digital world.",
  };

  const schemas = [organizationSchema, websiteSchema, videoGameSchema];

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