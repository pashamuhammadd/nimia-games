import { defineConfig } from "vitest/config";

// Same minimal shape as packages/validators/vitest.config.ts and
// apps/app/vitest.config.ts (see either file's own comment for the full
// convention — TESTING.md at the repo root also documents it). Added
// 18 Agustus 2026 as part of Fase 12 (Testing) of the 16 Agustus 2026
// Order/Payment/Invoice refactor — apps/studio had ZERO Vitest setup
// until now, flagged as a gap in that refactor's own audit doc.
//
// Deliberately `environment: "node"`, not "jsdom": every test file added
// alongside this config imports ONLY pure functions/data (the partner
// level ladder, the Creative Agent catalog-price-hint builder, the
// structured-data formatting helpers) — none of them touch the DOM, and
// none of them import a "use client"/React component or a "use server"
// Server Action module. If a future test needs to render a React
// component, add a second config (see packages/validators/vitest.config.ts's
// own note on this) rather than switching this one to jsdom for everyone.
export default defineConfig({
  test: {
    environment: "node",
  },
});
