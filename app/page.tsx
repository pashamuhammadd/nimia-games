import FlowShell from "@/components/flow/FlowShell";
import HeroSection from "@/components/home/HeroSection";
import MobileLanding from "@/components/home/MobileLanding";

export default function Home() {
  return (
    <>
      {/* Mobile: one continuous landing page, every section stacked. */}
      <div className="md:hidden">
        <MobileLanding />
      </div>

      {/* Desktop: hero-only entry point into the full-screen flow. */}
      <div className="hidden md:block">
        <FlowShell>
          <HeroSection />
        </FlowShell>
      </div>
    </>
  );
}
