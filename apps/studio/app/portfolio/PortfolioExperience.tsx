"use client";

import { PortfolioHeader } from "./components/PortfolioHeader";
import { TickerRow } from "./components/TickerRow";
import { FeaturedShowcase } from "./components/FeaturedShowcase";
import { FeaturedGames } from "./components/FeaturedGames";
import { PortfolioCta } from "./components/PortfolioCta";
import { TICKER_ROW_1, TICKER_ROW_2 } from "./data";

// Full "Portfolio Preview" experience for studio.nimiagames.com/portfolio
// (30 Juli 2026 brief), replacing the earlier "check back soon" placeholder
// now that real showreel clips exist. This is deliberately NOT a full
// portfolio grid — it's a teaser meant to pull visitors through to
// portfolio.nimiagames.com (see data.ts for why that link is used as-is
// even though that subdomain isn't built yet). Same page-experience
// pattern as WhyNimiaExperience / ServicesExperience: a client component
// holding the animated sections, kept out of page.tsx so that stays a
// plain async server component handling only auth/metadata.
//
// Section order fixed by the brief:
// 1. Header (title + subheadline + small "View Full Portfolio" link)
// 2. Ticker row 1 — 1:1 clips, scrolls right, ~25s loop
// 3. Ticker row 2 — 16:9 clips, scrolls left, slightly slower loop
// 4. Featured Showcase — 3 large videos
// 5. Featured Games — premium game-storefront showcase (added 30 Juli
//    2026, second brief same day): proves Nimia Studio ships original
//    games, not just animation/motion work. Sits right after the
//    animation showcase and before the closing CTA on purpose.
// 6. Closing CTA
export function PortfolioExperience() {
  return (
    <main className="relative overflow-hidden">
      <PortfolioHeader />

      <div className="flex flex-col gap-4 py-2 sm:gap-5">
        <TickerRow items={TICKER_ROW_1} direction="right" durationSeconds={25} aspect="square" />
        <TickerRow items={TICKER_ROW_2} direction="left" durationSeconds={30} aspect="video" />
      </div>

      <FeaturedShowcase />
      <FeaturedGames />
      <PortfolioCta />
    </main>
  );
}
