/** External link builders (docs/TELEGRAM.md's "read-only core + link out
 * for complex actions" strategy, Phase 2, 20 Agustus 2026). Every one of
 * these points at app.nimiastudio.com/nimiastudio.com rather than
 * reimplementing the target flow inside the Mini App: the multi-step
 * Order Configurator (apps/app/app/order/page.tsx's OrderWizard),
 * negotiation/payment/installment handling (apps/app/app/dashboard/orders),
 * and partner withdrawal (apps/app/app/dashboard/partners/withdraw) are
 * all real, already-shipped, non-trivial flows. Rebuilding any of them a
 * second time inside apps/miniapp is exactly the "business logic
 * duplicated 3+ places" trap apps/miniapp/README.md already warns about
 * for Services/Orders/Partner (that warning was about WRITE-side logic
 * specifically; this file only ever builds a URL, it never re-derives a
 * commission rate, a price, or an order status transition). Reading data
 * for these three tabs IS done directly against Supabase (RLS-scoped,
 * same as any other app in this monorepo) since a plain SELECT isn't
 * "logic" to duplicate, only these follow-through actions are routed to
 * the real app instead. */

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in this app's env vars (see .env.example).`);
  }
  return value.replace(/\/$/, "");
}

/** app.nimiastudio.com, the client dashboard app, home of the Order
 * Configurator, order/negotiation detail, and Partner Dashboard. */
export function appUrl(path = ""): string {
  const base = readEnv("NEXT_PUBLIC_APP_URL");
  return path ? `${base}/${path.replace(/^\//, "")}` : base;
}

/** nimiastudio.com, the marketing site, home of the Portfolio. */
export function studioUrl(path = ""): string {
  const base = readEnv("NEXT_PUBLIC_STUDIO_URL");
  return path ? `${base}/${path.replace(/^\//, "")}` : base;
}

/** The multi-step Order Configurator (apps/app/app/order/page.tsx) -
 * where "Request this service" and "Start a Project" both point, instead
 * of a second order form living inside apps/miniapp. */
export function orderWizardUrl(): string {
  return appUrl("order");
}

/** Full order history + negotiation/payment detail
 * (apps/app/app/dashboard/orders/page.tsx) - where an order's "View full
 * details" link points, since that page's negotiation thread, payment
 * proof upload, and installment schedule have no equivalent in the Mini
 * App's read-only Orders tab. */
export function dashboardOrdersUrl(): string {
  return appUrl("dashboard/orders");
}

/** The full Partner Dashboard (apps/app/app/dashboard/partners/page.tsx)
 * - referral kit, founding-partner banner, and the Withdraw flow
 * (dashboard/partners/withdraw) all live only there. */
export function dashboardPartnersUrl(): string {
  return appUrl("dashboard/partners");
}

/** A partner's own shareable referral link. Format matches
 * apps/app/app/r/[code]/route.ts exactly (that route lives in apps/app,
 * not apps/studio - opening it stores the code in a cookie then redirects
 * to /register). Built here rather than imported from that route, since a
 * Route Handler file can only export its HTTP-method functions. */
export function referralLink(code: string): string {
  return appUrl(`r/${code}`);
}

/** nimiastudio.com/portfolio - matches packages/telegram/src/keyboards.ts's
 * own portfolioUrl() (the bot's "View Our Portfolio" button); duplicated
 * here as a one-line function rather than imported, since that file lives
 * in a package built around Bot API objects, not a general link-builder. */
export function portfolioUrl(): string {
  return studioUrl("portfolio");
}
