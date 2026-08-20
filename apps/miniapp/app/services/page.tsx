import { studioUrl } from "../lib/links";

// Rewritten 20 Agustus 2026 per Pasha's feedback: the previous version
// read the full public.services catalog (3D Animation, Game Trailer, UI
// Animation, etc - packages/db/migrations/0002_catalog_and_clients.sql's
// service_category enum has no "meme"/"gif" categories at all) and
// rendered it grouped by category - broad, and not what this Mini App is
// for. The Telegram audience is crypto-community-first, so this tab is
// now a deliberately narrow, curated front door: 2D animation only, the
// two things that Telegram/crypto communities actually order on
// impulse (memes, GIF packs), plus one escape hatch to the full site for
// anything bigger. This is curated marketing copy, not a database read -
// there is no `services` table query on this page anymore.
//
// Follow-up, same day: Meme Animation and Crypto GIFs now open the new
// in-app order form (app/order/page.tsx) instead of linking out to
// app.nimiastudio.com/order - "harus bisa membuat order ... di miniapp".
// Custom Animation deliberately still goes to the full site: it's the
// escape hatch for anything outside these two curated offerings, and the
// full multi-step Order Configurator (apps/app/app/order) is genuinely
// the right tool for an open-ended project, not a duplicate of it here.
const OFFERINGS = [
  {
    icon: "🎭",
    title: "Meme Animation",
    tag: "Most requested",
    description:
      "Funny, share-ready animated memes made for your community. Built to spread on X and Telegram.",
    ctaLabel: "Order Now",
    href: "/order?offering=meme",
    external: false,
  },
  {
    icon: "✨",
    title: "Crypto GIFs",
    tag: "Welcome · GM/GN · Buy Alerts",
    description:
      "Custom animated GIFs for the moments your server needs: welcome new members, GM/GN greetings, buy alerts, and other niche crypto-community drops.",
    ctaLabel: "Order Now",
    href: "/order?offering=gif",
    external: false,
  },
  {
    icon: "🎬",
    title: "Custom Animation",
    tag: "Beyond memes & GIFs",
    description: "Need something bigger or more specific? Let's talk about your project on the full site.",
    ctaLabel: "Visit Nimia Studio",
    href: studioUrl(),
    external: true,
  },
] as const;

export default function ServicesPage() {
  return (
    <div className="page">
      <h1 className="greeting">🛒 Services</h1>
      <p className="subtitle">2D animation, built for Web3 communities. Tap an offering to get started.</p>

      {OFFERINGS.map((offering) => (
        <div key={offering.title} className="card offering-card">
          <div className="offering-head">
            <span className="offering-icon">{offering.icon}</span>
            <div>
              <p className="list-row-title" style={{ fontSize: 16 }}>
                {offering.title}
              </p>
              <p className="offering-tag">{offering.tag}</p>
            </div>
          </div>
          <p className="offering-description">{offering.description}</p>
          <a
            className="cta-button"
            href={offering.href}
            {...(offering.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {offering.ctaLabel}
          </a>
        </div>
      ))}

      <a className="link-row" href={studioUrl("portfolio")} target="_blank" rel="noreferrer">
        <span>🎨 See our portfolio first</span>
        <span className="arrow">↗</span>
      </a>
    </div>
  );
}
