import Image from "next/image";
import Link from "next/link";
import { Game } from "@/types/game";
import Footer from "@/components/layout/Footer";

export default function GameDetail({ game }: { game: Game }) {
  return (
    <article className="px-5 pb-16 pt-24 md:px-6 md:pt-28">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/games"
          className="text-xs font-semibold text-white/50 transition hover:text-white"
        >
          ← All Games
        </Link>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
          {game.status} • {game.genre}
        </p>

        <h1 className="mt-3 text-2xl font-black text-white md:text-4xl">
          {game.name}
        </h1>

        <p className="mt-1.5 text-sm font-bold text-white/70">
          {game.tagline}
        </p>

        <div className="nimia-card mt-7 overflow-hidden rounded-3xl">
          <div className="relative aspect-[16/9] w-full bg-white/[0.035]">
            <Image
              src={game.coverImage}
              alt={`${game.name} cover art`}
              fill
              priority
              className="object-contain p-8"
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-[11px] text-white/55"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-white/65">
          {game.longDescription}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="nimia-card rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/45">
              Platforms
            </h3>
            <p className="mt-2 text-sm text-white/70">
              {game.platforms.join(", ")}
            </p>
          </div>

          <div className="nimia-card rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/45">
              Genre
            </h3>
            <p className="mt-2 text-sm text-white/70">{game.genre}</p>
          </div>
        </div>

        {game.externalUrl && (
          <a
            href={game.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="nimia-button-primary mt-7 inline-flex rounded-full px-5 py-2.5 text-xs font-black"
          >
            Visit {game.name} ↗
          </a>
        )}
      </div>

      <div className="mt-16">
        <Footer />
      </div>
    </article>
  );
}
