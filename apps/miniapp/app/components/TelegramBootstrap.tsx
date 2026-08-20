"use client";

import { useEffect } from "react";

/** Runs once on mount (app/layout.tsx) to hand off control to the
 * Telegram client (docs/TELEGRAM.md §14, §15): `ready()` hides Telegram's
 * own loading spinner and signals the Mini App is interactive, `expand()`
 * requests the tallest available viewport instead of the default
 * half-height sheet. Also mirrors Telegram's safe-area insets into CSS
 * custom properties (globals.css's --tg-safe-area-*) so ordinary CSS —
 * not a Telegram-aware component — can pad around the notch/home-
 * indicator/nav-bar the same way it would with env(safe-area-inset-*) in
 * a normal PWA. Renders nothing; purely a side-effect component. */
export function TelegramBootstrap() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return; // Opened outside Telegram (local dev in a plain browser tab) — no-op.

    webApp.ready();
    webApp.expand();

    const insets = webApp.contentSafeAreaInset;
    if (insets) {
      const root = document.documentElement;
      root.style.setProperty("--tg-safe-area-top", `${insets.top}px`);
      root.style.setProperty("--tg-safe-area-bottom", `${insets.bottom}px`);
    }
  }, []);

  return null;
}
