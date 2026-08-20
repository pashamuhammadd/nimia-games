export {};

// Minimal shape of the global `window.Telegram.WebApp` object the
// Telegram Web App script (`https://telegram.org/js/telegram-web-app.js`,
// loaded in app/layout.tsx) injects. Deliberately NOT a full SDK typing
// (docs/TELEGRAM.md §12 recommends a real SDK like @telegram-apps/sdk-react
// for later phases, once the app needs MainButton/BackButton/haptics
// state management in more than one place) — just enough to type-check
// the handful of fields this Phase 0/1 slice actually touches
// (TelegramBootstrap.tsx, TelegramLinkGate.tsx).
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        /** The RAW, signed string — the ONLY thing ever sent to this
         * app's own backend for verification (webapp-auth.ts). Never
         * send initDataUnsafe anywhere that makes an authorization
         * decision — see that file's own top comment. */
        initData: string;
        /** Client-side-parsed, UNSIGNED convenience object — fine for
         * cosmetic use (e.g. a name in a loading message) but never for
         * anything security-relevant. */
        initDataUnsafe: {
          user?: { id: number; first_name?: string; username?: string };
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
      };
    };
  }
}
