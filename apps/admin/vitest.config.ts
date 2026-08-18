import { defineConfig } from "vitest/config";

// Same minimal shape as packages/validators/vitest.config.ts and
// apps/app/vitest.config.ts (see either file's own comment for the full
// convention — TESTING.md at the repo root also documents it). Added
// 18 Agustus 2026 as part of Fase 12 (Testing) of the 16 Agustus 2026
// Order/Payment/Invoice refactor — apps/admin had ZERO Vitest setup until
// now, flagged as a gap in that refactor's own audit doc.
//
// Deliberately `environment: "node"`, not "jsdom": every test file added
// alongside this config imports ONLY pure functions (status-label lookup
// tables, the operational-bucket classifier, the payment-summary
// calculator, the partner commission ladder) — none of them touch the
// DOM, and none of them import a "use client"/React component or a
// "use server" Server Action module (those pull in Next.js server-runtime
// machinery like next/headers' cookies(), which has no meaning outside a
// real request). If a future test needs to render a React component, add
// a second config (see packages/validators/vitest.config.ts's own note on
// this) rather than switching this one to jsdom for everyone.
//
// `css: { postcss: {} }` overrides Vite's default behavior of eagerly
// searching the project root for a PostCSS config at startup (it does
// this unconditionally, even though none of our test files import any
// CSS). That search hits apps/admin/postcss.config.mjs, whose
// `plugins: ["@tailwindcss/postcss"]` array-of-names shorthand is valid
// for Next.js's own (more lenient) PostCSS loader but NOT for PostCSS's
// plain Node API that Vite uses — so vitest failed at startup with
// "Invalid PostCSS Plugin found" before this override was added. This is
// a test-runner-only workaround; apps/admin/postcss.config.mjs itself is
// untouched and next dev/build for the real app are unaffected either way.
export default defineConfig({
  css: {
    postcss: {},
  },
  test: {
    environment: "node",
  },
});
