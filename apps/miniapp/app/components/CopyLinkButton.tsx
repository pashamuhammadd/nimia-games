"use client";

import { useState } from "react";

/** A small "Copy" button for the Partner tab's referral link
 * (app/partner/page.tsx). A client component because clipboard access
 * only exists in the browser - everything else on that page is a plain
 * Server Component read straight from Supabase. Falls back to a manual
 * "select the text" hint if navigator.clipboard isn't available (some
 * in-app webviews restrict it without a user gesture, and this button
 * IS a user gesture, but older Telegram clients can still lack the API
 * entirely) rather than throwing an unhandled error. */
export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", value);
    }
  }

  return (
    <button type="button" onClick={handleClick}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
