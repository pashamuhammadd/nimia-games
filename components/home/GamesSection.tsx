import Image from "next/image";
import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";
import { games } from "@/data/games";
import { Game } from "@/types/game";

interface GamesSectionProps {
  variant?: "preview" | "full";
}

export default function GamesSection({ variant = "full" }: GamesSectionProps) {
  const isPreview = variant === "preview";
  const list = isPreview ? games.slice(0, 1) : games;

  return (
    <section id="games" className="px-5 pb-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
                {isPreview ? "Featured Games" : "All Games"}
              </p>

              <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
                Original worlds. <br />
                <span className="nimia-accent-text">Built with passion.</span>
              </h2>
            </div>

            {isPreview && (
              <FlowLink
                href="/games"
                className="nimia-button-secondary inline-flex w-fit rounded-full px-4 py-2.5 text-xs font-bold"
              >
                Lihat Semua Game →
              </FlowLink>
            )}
          </div>
        </Reveal>

        <div className="flex flex-col gap-6">
          {list.map((game, index) => (
            <Reveal key={game.slug} delay={index * 90}>
              <GameCard game={game} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GameCard({ game }: { game: Game }) {
  return (
    <div className="nimia-card overflow-hidden rounded-3xl">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-center justify-center p-6 md:p-8">
          <div className="group relative aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <Image
              src={game.coverImage}
              alt={`${game.name} Logo`}
              fill
              className="object-contain p-7 transition duration-700 group-hover:scale-105 md:p-8"
            />

            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />

            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/75 backdrop-blur">
              {game.status}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
            {game.genre}
          </p>

          <h3 className="mt-3 text-xl font-black text-white md:text-2xl">
            {game.name}
          </h3>

          <p className="mt-1.5 text-sm font-bold text-white/70">
            {game.tagline}
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            {game.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[11px] text-white/55"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <FlowLink
              href={`/games/${game.slug}`}
              className="nimia-button-secondary inline-flex rounded-full px-4 py-2.5 text-xs font-bold"
            >
              Detail Game →
            </FlowLink>

            {game.externalUrl && (
              <a
                href={game.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="nimia-button-primary inline-flex rounded-full px-4 py-2.5 text-xs font-bold"
              >
                Visit ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
