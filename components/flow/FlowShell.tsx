import FlowNav from "@/components/flow/FlowNav";

interface FlowShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a single top-level flow step (Home / Games / Gallery / About /
 * Contact) as a full-viewport screen with Back/Next buttons pinned to the
 * bottom. Switching steps only happens via the navbar or those buttons.
 * Plain mouse/touch scrolling stays plain page scrolling and never changes
 * the section on its own.
 */
export default function FlowShell({ children, className = "" }: FlowShellProps) {
  return (
    <div className={`nimia-flow-screen min-h-[100dvh] pb-28 pt-24 md:pt-28 ${className}`}>
      {children}
      <FlowNav />
    </div>
  );
}
