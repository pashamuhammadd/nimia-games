import type { Metadata } from "next";
import FlowShell from "@/components/flow/FlowShell";
import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Nimia Games for game development, animation, and digital asset collaborations through Nimia Studio.",
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
              Let&rsquo;s <span className="nimia-accent-text">collaborate</span>{" "}
              with Nimia Games.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Need game development, animation, or digital asset production?
              The Nimia production team is ready to help through Nimia
              Studio.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-9">
            <CTASection
              compact
              eyebrow="Have a project you want to build?"
              title={
                <>
                  Start your project with{" "}
                  <span className="nimia-accent-text">Nimia Studio</span>.
                </>
              }
              description="From game development and animation to custom digital assets. Reach out to the Nimia Studio team to start the conversation."
            />
          </Reveal>

          <Reveal delay={160} className="mt-8 grid gap-4 sm:grid-cols-2">
            <FlowLink href="/about" className="nimia-card block rounded-2xl p-5">
              <h3 className="text-sm font-black text-white">
                Meet the Founder
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Learn more about Nimia Games and the person behind it.
              </p>
            </FlowLink>

            <FlowLink href="/games" className="nimia-card block rounded-2xl p-5">
              <h3 className="text-sm font-black text-white">
                Explore Our Games
              </h3>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Check out Lifetopia World and other games we&rsquo;re
                developing.
              </p>
            </FlowLink>
          </Reveal>
        </div>
      </div>

      <Footer />
    </FlowShell>
  );
}
