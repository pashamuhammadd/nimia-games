"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Send } from "lucide-react";
import { buildTelegramHelpUrl } from "../format";
import type { ServiceLine } from "../schema";

// NEXT_PUBLIC_* is inlined at build time. Until the studio's own Telegram
// username is decided, this is unset and no Telegram button is shown
// (Pasha's personal Telegram Business account is never used as a fallback).
const STUDIO_TELEGRAM_URL = process.env.NEXT_PUBLIC_STUDIO_TELEGRAM_URL;

const NEXT_STEPS = [
  "The team reviews your brief and may ask follow-up questions.",
  "You receive a quote. Accept it or counter-offer from your dashboard.",
  "Once the price is agreed you pay from your dashboard, and production starts.",
];

export function BriefSubmitted({
  orderCode,
  serviceLine,
  title,
}: {
  orderCode: string;
  serviceLine: ServiceLine;
  title: string;
}) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = React.useState(false);
  const telegramUrl = buildTelegramHelpUrl(STUDIO_TELEGRAM_URL, orderCode, serviceLine, title);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="brief-sent-title" className="flex flex-col gap-8">
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nimia-pink)]/15">
          <Check className="h-7 w-7 text-[var(--nimia-pink)]" aria-hidden="true" />
        </span>
        <h1
          id="brief-sent-title"
          ref={headingRef}
          tabIndex={-1}
          className="nimia-font-display mt-5 text-3xl font-bold text-white outline-none sm:text-4xl"
        >
          Brief sent
        </h1>
        <p className="mt-3 text-white/70">
          Your order number is the reference for everything about this project, in your dashboard and in chat.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <span className="text-sm text-white/60">Order number</span>
        <span className="font-mono text-xl font-bold tracking-wide text-white">{orderCode}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:border-white/40"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Order number copied" : ""}
        </span>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-white/75">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/dashboard/orders"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--nimia-pink)] px-7 font-bold text-black"
        >
          View my orders
        </Link>
        {telegramUrl ? (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-white/80 px-7 font-bold text-white hover:bg-white/5"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            Discuss on Telegram
            <span className="sr-only"> (opens in a new tab, with your order number filled in)</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
