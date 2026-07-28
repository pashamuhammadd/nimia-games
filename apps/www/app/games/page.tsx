import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import GamesSection from "@/components/home/GamesSection";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Explore all the original games Nimia Games is developing, including Lifetopia World, a cozy life simulation set in the Solana ecosystem.",
  alternates: {
    canonical: "/games",
  },
};

export default function GamesPage() {
  return (
    <FlowShell>
      <GamesSection variant="full" />
    </FlowShell>
  );
}
