"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@nimia/ui";
import type { FlowStep } from "../data";

// Small reusable vertical flow diagram (label -> label -> label, connected
// by down-chevrons). Used by Step 4's price-negotiation illustration
// (size="lg") and Step 6's payment-verification illustration (size="sm") —
// same component, driven entirely by the `flow` array in data.ts, so a
// future step could reuse this pattern without new markup.
export function FlowDiagram({ items, size = "sm" }: { items: FlowStep[]; size?: "sm" | "lg" }) {
  return (
    <div className="mt-5 flex flex-col items-stretch gap-1 sm:mt-6" role="list" aria-label="Process flow">
      {items.map((step, i) => (
        <div key={`${step.label}-${i}`} className="flex flex-col items-center gap-1" role="listitem">
          <span
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-center font-semibold",
              size === "lg" ? "text-sm" : "text-xs",
              step.accent
                ? "border-[var(--nimia-pink)]/40 bg-gradient-to-r from-[var(--nimia-crimson)]/25 to-[var(--nimia-pink)]/25 text-[var(--nimia-pink)]"
                : "border-white/10 bg-white/[0.04] text-[var(--foreground)]/85",
            )}
          >
            {step.label}
          </span>
          {i < items.length - 1 ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--nimia-muted)]" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
