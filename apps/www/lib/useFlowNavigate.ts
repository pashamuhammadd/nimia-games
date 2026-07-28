"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

// The View Transitions API is a native browser capability (Chrome/Edge),
// not yet in every TS DOM lib version, so it's typed as an optional extra
// on Document rather than assumed to exist.
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => void;
};

/**
 * Navigate to another flow step with a native cross-fade/slide animation
 * when the browser supports the View Transitions API, falling back to a
 * plain instant navigation everywhere else (Safari, Firefox, older Chrome).
 */
export function useFlowNavigate() {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      const doc = document as DocumentWithViewTransition;

      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router]
  );
}
