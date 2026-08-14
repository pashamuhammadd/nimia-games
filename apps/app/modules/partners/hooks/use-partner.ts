"use client";

import * as React from "react";

export type PartnerCopyTarget = "code" | "link";

/**
 * Shared "copy to clipboard, show a brief confirmed state" behavior for the
 * Partners page — used by partner-banner.tsx (Copy Referral Link / Copy
 * Referral Code buttons) and referral-code-card.tsx / referral-link-card.tsx
 * so all three stay in sync about what "copied" means without each owning
 * its own timeout/state logic.
 */
export function usePartnerCopy(resetAfterMs: number = 2000) {
  const [copied, setCopied] = React.useState<PartnerCopyTarget | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const copy = React.useCallback(
    (target: PartnerCopyTarget, value: string) => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        // Fire-and-forget — clipboard writes can fail silently (permissions,
        // insecure context); the UI still flips to "Copied" optimistically
        // since the value is also fully visible on-screen for manual copy.
        navigator.clipboard.writeText(value).catch(() => {});
      }
      setCopied(target);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied((current) => (current === target ? null : current));
      }, resetAfterMs);
    },
    [resetAfterMs],
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { copied, copy };
}
