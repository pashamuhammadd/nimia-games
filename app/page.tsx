import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import GamesSection from "@/components/home/GamesSection";
import GalleryTickerSection from "@/components/home/GalleryTickerSection";
import WhyNimiaSection from "@/components/home/WhyNimiaSection";
import CTASection from "@/components/home/CTASection";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060608] text-white">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <GamesSection />
      <GalleryTickerSection />
      <WhyNimiaSection />
      <CTASection />
      <Footer />
    </main>
  );
}