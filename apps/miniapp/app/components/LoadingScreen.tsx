/** Shared branded loading UI (docs/TELEGRAM.md's premium/polished mandate
 * applied to every async wait in this app — Next.js route-level
 * `loading.tsx` files render this automatically while a tab's Server
 * Component is fetching (Home/Services/Orders/Partner/Account all await
 * Supabase before rendering), and TelegramLinkGate uses it for the
 * "checking whether this Telegram account is already linked" phase.
 * Pure CSS animation (spin + pulse, see globals.css) — no animation
 * library, so it stays instant inside Telegram's webview. */
export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-ring">
        <span className="loading-mark">N</span>
      </div>
      <p className="loading-label">{label}</p>
    </div>
  );
}

/** Small inline spinner for in-place loading states that aren't a full
 * page — e.g. the "Continue with Telegram" button while
 * TelegramLinkGate.tsx's linking request is in flight. Sized to sit next
 * to button text on one line. */
export function InlineSpinner() {
  return <span className="inline-spinner" aria-hidden="true" />;
}
