# Testing

Status as of 15 Agustus 2026: this monorepo had **zero automated tests**
anywhere (flagged in the 15 Agustus platform audit as one of the blockers
to calling the platform commercially ready). This document sets up the
foundation — [Vitest](https://vitest.dev), wired through Turborepo — and
ships one real, passing test suite (`packages/validators`) as a working
example. It is a starting point, not full coverage: see "What's covered
today" and "Suggested next targets" below for exactly what is and isn't
tested yet.

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

None of these are done yet — this is a prioritized list for whoever picks
up testing next, ordered by "how much money/trust is at stake if this
silently breaks":

1. **`apps/app/modules/order/pricing/*`** (`calculate-estimate.ts`,
   `calculate-bundle-estimate.ts`, `calculate-custom-order-estimate.ts`) —
   pure functions that compute what a client is quoted and what
   `submit-order-action.ts`/`submit-custom-order-action.ts` re-derive
   server-side before trusting any price. A silent bug here is a silent
   pricing bug. All three are pure (no I/O), same shape as the validators
   tested today — straightforward to fixture and test.
2. **`apps/admin/app/lib/orderStatus.ts`** and
   **`apps/studio/app/lib/orderStatus.ts`** — `orderStatusMeta()`/
   `installmentStatusMeta()`'s fallback behavior for an unrecognized
   status string matters (silently mislabeling a status is a support
   headache, not a crash, so it's easy to ship unnoticed).
3. **`apps/admin/app/(protected)/partners/partner-level.ts`**
   (`resolvePartnerLevelDisplay`/`nextPartnerLevelDisplay`) — the
   commission-tier ladder is duplicated in SQL (`partner_commission_rate()`,
   migrations 0016/0030) and in this TypeScript file by necessity (see
   that migration's own "manually synced in multiple places" comment); a
   test here is the only mechanical guard that the two don't drift apart
   after the next tier change.
4. A Supabase-backed integration test for at least one RPC (e.g.
   `submit_installment_payment`, migration 0038) once there's a disposable
   test database to point at — everything above is pure-function unit
   testing; nothing here yet exercises RLS policies or triggers, which is
   where a lot of this schema's actual business logic lives.
