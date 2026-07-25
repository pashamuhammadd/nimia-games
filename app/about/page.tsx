import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import AboutSection from "@/components/home/AboutSection";

export const metadata: Metadata = {
  title: "About",
  description:
    "Kenalan dengan Nimia Games, studio kreatif independen di balik Lifetopia World, dan sosok Pasha Muhammad selaku founder.",
};

export default function AboutPage() {
  return (
    <FlowShell>
      <AboutSection variant="full" />
    </FlowShell>
  );
}
