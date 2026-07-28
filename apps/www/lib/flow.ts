// Single source of truth for the main site "flow": the ordered sequence of
// full-screen steps a visitor moves through via the navbar, scroll, or the
// next/back buttons. Keep this list in sync with the routes under app/.
export interface FlowStep {
  href: string;
  label: string;
}

export const FLOW: FlowStep[] = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function flowIndex(pathname: string): number {
  // /games/[slug] and any other nested route falls back to the closest
  // matching top-level step so back/next still behave sensibly.
  const exact = FLOW.findIndex((step) => step.href === pathname);
  if (exact !== -1) return exact;

  const nested = FLOW.findIndex(
    (step) => step.href !== "/" && pathname.startsWith(step.href)
  );
  return nested !== -1 ? nested : 0;
}

export function nextStep(pathname: string): FlowStep | null {
  const i = flowIndex(pathname);
  return i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

export function prevStep(pathname: string): FlowStep | null {
  const i = flowIndex(pathname);
  return i > 0 ? FLOW[i - 1] : null;
}
