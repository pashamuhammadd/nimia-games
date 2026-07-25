import Image from "next/image";
import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";
import WhyNimiaSection from "@/components/home/WhyNimiaSection";

interface AboutSectionProps {
  variant?: "preview" | "full";
}

export default function AboutSection({ variant = "full" }: AboutSectionProps) {
  const isPreview = variant === "preview";

  return (
    <section id="about" className="px-5 py-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/45">
            About Nimia
          </p>

          {isPreview && (
            <FlowLink
              href="/about"
              className="text-xs font-semibold text-white/60 transition hover:text-white"
            >
              Learn More →
            </FlowLink>
          )}
        </div>

        <Reveal>
          <h2 className="max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
            More than a <span className="nimia-accent-text">game studio.</span>
          </h2>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
            Nimia Games is an independent creative studio dedicated to
            building original games, high-quality animation, and digital
            experiences that inspire players, communities, and the Solana
            ecosystem.
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
            We combine creativity, technology, and production experience to
            create memorable digital worlds with long-term vision and strong
            execution.
          </p>

          {!isPreview && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Our first title, Lifetopia World, is built with true on-chain
              ownership on Solana. From day one, we&rsquo;re designing our
              production pipeline, tooling, and partnerships so the studio
              can expand across more ecosystems and more original IPs as we
              grow.
            </p>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="nimia-card rounded-2xl p-5">
              <h3 className="text-base font-black text-white">
                Game Development
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Original IP, Solana-powered ownership, cozy simulation games,
                and interactive digital worlds.
              </p>
            </div>

            <div className="nimia-card rounded-2xl p-5">
              <h3 className="text-base font-black text-white">
                Animation & Digital Assets
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Character animation, trailers, motion graphics, game assets,
                UI animation, and creative production for modern brands.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {!isPreview && (
        <>
          <Reveal delay={120} className="mt-4">
            <WhyNimiaSection />
          </Reveal>

          {/* Founder identity kept low-key, at the very bottom, so the
              section reads as "about Nimia Games" first and foremost. */}
          <Reveal delay={200} className="mt-6 px-5 md:px-6">
            <div className="mx-auto max-w-6xl">
              <FounderCard />
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}

function FounderCard() {
  return (
    <div className="nimia-card flex flex-col items-center gap-4 rounded-2xl p-5 text-center sm:flex-row sm:text-left">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.035]">
        <Image
          src="/founder/pasha.png"
          alt="Pasha Muhammad"
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Founder
        </p>
        <p className="mt-1 text-sm font-black text-white">Pasha Muhammad</p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          Building Nimia Games from the ground up, focused on game
          development, animation production, and digital assets.
        </p>
      </div>

      <a
        href="https://pashamuhammad.me"
        target="_blank"
        rel="noreferrer"
        className="nimia-button-secondary shrink-0 rounded-full px-4 py-2 text-xs font-bold"
      >
        Profile ↗
      </a>
    </div>
  );
}
