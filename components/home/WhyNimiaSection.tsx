import { Gamepad2, Globe2, Sparkles, Users, Zap } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { values } from "@/data/values";

const icons = { Sparkles, Gamepad2, Zap, Globe2, Users };

export default function WhyNimiaSection() {
  return (
    <section id="why-nimia" className="px-5 py-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
              Why Nimia
            </p>

            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              More than a studio. <br />
              <span className="nimia-accent-text">We build impact.</span>
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((item, index) => {
              const Icon = icons[item.icon];

              return (
                <Reveal key={item.title} delay={index * 70}>
                  <div className="nimia-card rounded-2xl p-5">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04]">
                      <Icon size={19} strokeWidth={2} className="text-zinc-200" />
                    </div>

                    <h3 className="text-sm font-black text-white">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-white/55">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
