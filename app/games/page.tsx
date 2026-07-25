import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import GamesSection from "@/components/home/GamesSection";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Jelajahi semua game orisinal yang sedang dikembangkan Nimia Games, termasuk Lifetopia World, cozy life simulation di ekosistem Solana.",
};

export default function GamesPage() {
  return (
    <FlowShell>
      <GamesSection variant="full" />
    </FlowShell>
  );
}
