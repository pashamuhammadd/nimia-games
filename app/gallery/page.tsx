import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import GalleryTicker from "@/components/gallery/GalleryTicker";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Koleksi lengkap animasi, motion graphics, game trailer, dan visual showcase ekosistem Solana yang diproduksi Nimia Games.",
};

export default function GalleryPage() {
  return (
    <FlowShell>
      <GalleryTicker variant="full" />
    </FlowShell>
  );
}
