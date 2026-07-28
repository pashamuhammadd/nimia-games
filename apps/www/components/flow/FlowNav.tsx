"use client";

import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FlowLink from "@/components/flow/FlowLink";
import { nextStep, prevStep } from "@/lib/flow";

export default function FlowNav() {
  const pathname = usePathname();
  const prev = prevStep(pathname);
  const next = nextStep(pathname);

  if (!prev && !next) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-5 md:bottom-7">
      <div className="nimia-flow-nav pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#0a0407]/85 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {prev && (
          <FlowLink
            href={prev.href}
            className="nimia-flow-btn flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white/70 transition hover:text-white"
          >
            <ChevronLeft size={15} />
            Back
          </FlowLink>
        )}

        {prev && next && <span className="h-4 w-px bg-white/10" />}

        {next && (
          <FlowLink
            href={next.href}
            className="nimia-flow-btn nimia-button-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
          >
            Next
            <ChevronRight size={15} />
          </FlowLink>
        )}
      </div>
    </div>
  );
}
