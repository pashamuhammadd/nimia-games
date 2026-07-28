import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import AboutSection from "@/components/home/AboutSection";

export const metadata: Metadata = {
  title: "About",
  description:
    "Get to know Nimia Games, the independent creative studio behind Lifetopia World, and meet founder Pasha Muhammad.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <FlowShell>
      <AboutSection variant="full" />
    </FlowShell>
  );
}
