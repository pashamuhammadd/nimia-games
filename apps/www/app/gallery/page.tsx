import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import GalleryTicker from "@/components/gallery/GalleryTicker";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "The complete collection of animation, motion graphics, game trailers, and Solana ecosystem visual showcases produced by Nimia Games.",
  alternates: {
    canonical: "/gallery",
  },
};

export default function GalleryPage() {
  return (
    <FlowShell>
      <GalleryTicker variant="full" />
    </FlowShell>
  );
}
