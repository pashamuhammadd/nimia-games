"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CreativeInput } from "./CreativeInput";

export interface CreativeAgentSectionProps {
  headline: string;
  subtext: string;
}

const GENERIC_ERROR_MESSAGE = "Something went wrong reaching Nimia Creative Agent. Please try again.";

// Homepage hero for Nimia Creative Agent (13 Agustus 2026). Originally
// this component owned the ENTIRE idle -> conversing -> confirmed state
// machine, morphing in place on the homepage itself. Split out (P8, same
// date) after live testing showed the in-place conversation felt cramped
// — the full conversation now lives on its own dedicated page
// (app/creative-agent/page.tsx, rendering CreativeAgentWorkspace), and
// this component's only job is the very first message: send it, then
// hand off.
//
// The handoff works without any client-side state to carry across the
// navigation — sending the first message here already creates the
// session and sets its httpOnly cookie (see app/api/creative-agent/
// route.ts), so by the time router.push lands on /creative-agent,
// CreativeAgentWorkspace's own restore-on-mount effect finds everything
// waiting for it server-side. No sessionStorage/query-param relay needed.
export function CreativeAgentSection({ headline, subtext }: CreativeAgentSectionProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [draft, setDraft] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/creative-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "message", text: trimmed }),
      });
      const data = await response.json();

      if (data.ok) {
        router.push("/creative-agent");
        return;
      }
      setError(data.reason ?? GENERIC_ERROR_MESSAGE);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  const fadeTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition}
      className="mx-auto w-full max-w-2xl"
    >
      <h1 className="nimia-font-display text-center text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
        {headline}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-center text-base text-[var(--nimia-muted)] sm:text-lg">{subtext}</p>

      <div className="mt-10">
        <CreativeInput
          variant="hero"
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          placeholder="I want to create..."
          helperText={error ?? "Don't worry if your idea isn't complete. Just tell us what you have in mind."}
          disabled={submitting}
          loading={submitting}
        />
      </div>
    </motion.div>
  );
}
