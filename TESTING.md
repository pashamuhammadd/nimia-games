# Testing

Status as of 15 Agustus 2026: this monorepo had **zero automated tests**
anywhere (flagged in the 15 Agustus platform audit as one of the blockers
to calling the platform commercially ready). This document sets up the
foundation — [Vitest](https://vitest.dev), wired through Turborepo — and
ships one real, passing test suite (`packages/validators`) as a working
example. It is a starting point, not full coverage: see "What's covered
today" and "Suggested next targets" below for exactly what is and isn't
tested yet.

**Update, 18 Agustus 2026 (Fase 12 of the 16 Agustus Order/Payment/Invoice
refactor):** `apps/admin` and `apps/studio` both went from zero Vitest
setup to wired-and-passing the same day — see "What's covered today"
below for the full new list. `apps/app` already had a full suite (built
15-16 Agustus alongside the payment-method-generalization and refactor
work) and needed no infra changes here, only more test files over time.
`turbo run test` now fans out to 4 workspaces (`packages/validators`,
`apps/app`, `apps/admin`, `apps/studio`) — `apps/www` remains untested,
see "Suggested next targets".

## Why Vitest

- Zero-config TypeScript support (no separate ts-jest/babel setup needed)
  — matches this repo's "modular, low-maintenance tooling" preference.
- Fast, ESM-native, and the same tool works for a pure-logic package
  (`packages/validators`) and, later, a component test in `apps/*` without
  switching frameworks.
- First-class Turborepo integration: `turbo run test` fans out to every
  workspace that defines a `test` script, in dependency order, with the
  same caching every other task (`build`, `lint`) already gets.

## Running tests

```bash
npm install          # picks up the new vitest devDependency
npm test             # turbo run test — runs every workspace's test script
npm test -- --filter=@nimia/validators   # just one package
```

Inside any package with tests, `npm run test:watch` (where defined) runs
Vitest in watch mode for local development.

## What's covered today

- **`packages/validators`** — every exported Zod schema (`orderFormSchema`,
  `signInSchema`, `signUpSchema`, `contactFormSchema`) has a real test
  file next to its source (`order.test.ts`, `auth.test.ts`,
  `contact.test.ts`). These schemas are shared between client-side
  react-hook-form resolvers and server-side re-validation across
  apps/studio, apps/app, and apps/www — a silent regression here (e.g. an
  "optional" field that starts rejecting empty strings again, a URL check
  that stops accepting a valid link) breaks real submitted forms, so this
  was the highest-value, lowest-effort place to start.
- **`apps/app`** — 8 test files, 75 tests, over
  `modules/order/pricing/*` (the estimate/bundle/custom-order/installment-
  fee/lifecycle-simulation calculators) and
  `modules/order/data/category-requirements.ts`. Built 15-16 Agustus 2026
  alongside the payment-method-generalization work and the Order/Payment/
  Invoice refactor's Fase 5-8.
- **`apps/admin`** — wired up 18 Agustus 2026 (Fase 12). 4 test files,
  34 tests: `app/lib/orderStatus.ts` (label/color lookup + unrecognized-
  status fallback), `app/lib/orderPaymentSummary.ts` (mirrors
  `apps/app`'s own payment-summary tests scenario-for-scenario, guarding
  against the two hand-synced copies drifting), `app/lib/
  operationalStatus.ts` (`computeOperationalBucket` — the Fase 9
  3-dimension classifier, the newest and highest-risk pure logic in this
  app at the time), and `app/(protected)/partners/partner-level.ts`
  (`resolvePartnerLevelDisplay`/`nextPartnerLevelDisplay` — the ladder +
  Founding Partner override + `/partners-page` Gold floor).
- **`apps/studio`** — wired up 18 Agustus 2026 (Fase 12). 3 test files,
  19 tests: `modules/partners/constants/partner-level.ts` (the ladder's
  ordering invariants + `nextPartnerLevel`), `modules/creative-agent/lib/
  catalog-price-hints.ts` (`buildCatalogPriceHints` — feeds Gemini's
  system instruction directly, tested structurally against the live
  catalog rather than pinning exact text), and `modules/creative-agent/
  lib/structured-data-fields.ts` (`formatStructuredDataValue`/
  `structuredDataRows` — shared by the pre-confirm preview and post-
  confirm brief cards, guards them from drifting apart).

## Convention for adding a new package's tests

1. Add `vitest` to that package's own `devDependencies` (don't rely on
   hoisting from the root — keeps each package correct in isolation).
2. Add `"test": "vitest run"` (and optionally `"test:watch": "vitest"`) to
   its `package.json` scripts.
3. Colocate test files next to the source they test: `foo.ts` →
   `foo.test.ts` in the same folder. Don't create a separate `__tests__/`
   tree — colocation makes it obvious when a file has no test yet.
4. If the package needs a DOM (testing a React component, not just pure
   logic), copy `packages/validators/vitest.config.ts` and add
   `test.environment: "jsdom"` — pure-logic packages should stay on the
   default `node` environment, it's faster.
5. `turbo.json`'s `test` task already applies repo-wide — no per-package
   turbo config needed, just the `test` script in that package's
   `package.json`.

## Suggested next targets (highest risk-adjusted value first)

Updated 18 Agustus 2026 — items 1-3 from the original list are now done
(see "What's covered today"). Note: the original item 2 also named
`apps/studio/app/lib/orderStatus.ts`, but that file no longer exists —
the 14 Agustus multi-app split moved the whole dashboard (and its
order/installment status metadata) to `apps/app`, so `apps/studio` never
got its own copy to test. What's left, ordered by "how much money/trust
is at stake if this silently breaks":

1. **`apps/app/modules/partners/utils/level-calculator.ts`**
   (`resolvePartnerLevel`) — the THIRD hand-synced copy of the same
   commission ladder `apps/admin`'s and `apps/studio`'s copies now have
   tests for (see 0016/0030's own "manually synced in multiple places"
   comment). Still untested — same drift risk, just in the one app that
   didn't get covered in this pass.
2. **`apps/www`** — has no Vitest setup at all yet (not part of Fase 12's
   scope, which was specifically `apps/admin`/`apps/studio`). Lowest
   urgency of the 4 apps: no payment/order logic lives there, mostly
   marketing pages + the contact form (already covered indirectly via
   `packages/validators`' `contactFormSchema` test).
3. A Supabase-backed integration test for at least one RPC (e.g.
   `submit_installment_payment`, migration 0038, or the notification
   triggers in 0032/0048) once there's a disposable test database to
   point at — everything covered today is pure-function unit testing;
   nothing yet exercises RLS policies or triggers, which is where a lot of
   this schema's actual business logic lives (including 100% of Fase 10's
   new notification behavior).
