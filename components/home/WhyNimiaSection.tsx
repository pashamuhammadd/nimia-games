import { Gamepad2, Globe2, Sparkles, Users, Zap } from "lucide-react";

const values = [
  {
    icon: Sparkles,
    title: "Creative First",
    description: "We put creativity at the heart of every world we make.",
  },
  {
    icon: Gamepad2,
    title: "Game Focused",
    description: "We build games and experiences players love to play.",
  },
  {
    icon: Zap,
    title: "Fast Production",
    description: "Agile workflow with strong delivery discipline.",
  },
  {
    icon: Globe2,
    title: "Web3 Ready",
    description: "Built for communities, ownership, and future digital ecosystems.",
  },
  {
    icon: Users,
    title: "Scalable Team",
    description: "A creative production team ready to scale with your vision.",
  },
];

export default function WhyNimiaSection() {
  return (
    <section id="why-nimia" className="px-5 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-white/45">
              Why Nimia
            </p>

            <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
              More than a studio. <br />
              <span className="nimia-gradient-text">We build impact.</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="nimia-card rounded-3xl p-6">
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04]">
                    <Icon size={23} strokeWidth={2} className="text-zinc-200" />
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/55">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}