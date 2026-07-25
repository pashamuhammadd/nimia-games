import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Hubungi Nimia Games untuk kolaborasi game development, animasi, dan digital asset lewat Nimia Studio.",
};

export default function ContactPage() {
  return (
    <FlowShell>
      <div className="px-5 pb-10 md:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
              Contact
            </p>

            <h1 className="max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
              Mari <span className="nimia-accent-text">berkolaborasi</span>{" "}
              dengan Nimia Games.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Butuh jasa pembuatan game, animasi, atau digital asset? Tim
              produksi Nimia siap membantu lewat Nimia Studio.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-9">
            <CTASection
              compact
              eyebrow="Punya proyek yang ingin dibangun?"
              title={
                <>
                  Mulai proyekmu bersama{" "}
                  <span className="nimia-accent-text">Nimia Studio</span>.
                </>
              }
              description="Dari game development, animasi, hingga digital asset custom. Hubungi tim Nimia Studio untuk mulai diskusi proyekmu."
            />
          </Reveal>

          <Reveal delay={160} className="mt-8 grid gap-4 sm:grid-cols-2">
            <FlowLink href="/about" className="nimia-card block rounded-2xl p-5">
              <h3 className="text-sm font-black text-white">
                Kenalan dengan Founder
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Pelajari lebih lanjut tentang Nimia Games dan sosok di
                baliknya.
              </p>
            </FlowLink>

            <FlowLink href="/games" className="nimia-card block rounded-2xl p-5">
              <h3 className="text-sm font-black text-white">
                Jelajahi Game Kami
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Lihat Lifetopia World dan game lain yang sedang kami
                kembangkan.
              </p>
            </FlowLink>
          </Reveal>
        </div>
      </div>

      <Footer />
    </FlowShell>
  );
}
