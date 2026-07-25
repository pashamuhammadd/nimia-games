import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import GameDetail from "@/components/games/GameDetail";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);

  if (!game) {
    return { title: "Game Not Found" };
  }

  return {
    title: game.name,
    description: game.description,
    openGraph: {
      title: `${game.name} | Nimia Games`,
      description: game.description,
      images: [{ url: game.coverImage }],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = games.find((g) => g.slug === slug);

  if (!game) {
    notFound();
  }

  return <GameDetail game={game} />;
}
