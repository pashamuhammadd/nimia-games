import HeroSection from "@/components/home/HeroSection";
import GamesSection from "@/components/home/GamesSection";
import GalleryTicker from "@/components/gallery/GalleryTicker";
import AboutSection from "@/components/home/AboutSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/layout/Footer";

/**
 * Mobile-only version of the homepage: one continuous scrollable landing
 * page with every section stacked (like a classic one-pager), instead of
 * the full-screen-per-route flow desktop uses. Rendered alongside the
 * desktop tree in app/page.tsx and toggled purely with responsive classes.
 */
export default function MobileLanding() {
  return (
    <div className="pt-24">
      <HeroSection />
      <GamesSection variant="preview" />
      <GalleryTicker variant="preview" />
      <AboutSection variant="preview" />
      <CTASection />
      <Footer />
    </div>
  );
}
