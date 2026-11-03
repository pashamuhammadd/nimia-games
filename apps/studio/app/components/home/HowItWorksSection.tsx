// Every step below describes what the platform ALREADY does today (order
// wizard, negotiation in the dashboard, crypto payment in full or
// installments with a receipt per verified payment, project tracking and
// deliveries). The new flow's Telegram hand-off and automatic invoice are
// not built yet (Tahap 2–4), so they are intentionally not promised here.
const STEPS = [
  {
    title: "Tell us what you need",
    body: "Pick a service, share your brief, references, and budget. Your budget is a starting point, not the final price.",
  },
  {
    title: "Agree on scope and price",
    body: "We review your brief and send a quote. Counter-offer from your dashboard until the price works for both sides.",
  },
  {
    title: "Pay your way",
    body: "Pay in crypto, in full or in installments. Every verified payment comes with a receipt.",
  },
  {
    title: "Follow along and receive",
    body: "Track production from your dashboard and download your files when they’re delivered.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 border-t border-[var(--orchid-border)]">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:py-28">
        <h2 id="how-title" className="orchid-display text-[clamp(2.25rem,6vw,3.75rem)]">
          How it works
        </h2>
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t-2 border-[var(--orchid-border)] pt-6">
              <span aria-hidden="true" className="orchid-display orchid-gradient-text text-5xl">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-[var(--orchid-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
