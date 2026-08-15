import { defineConfig } from "vitest/config";

// Same minimal shape as packages/validators/vitest.config.ts (see that
// file's own comment for the full convention). Added 15 Agustus 2026
// alongside the Vitest "simulation" suite for the generalized Payment
// Method / installments system — see modules/order/pricing/__tests__ and
// modules/order/state/__tests__.
//
// Deliberately `environment: "node"`, not "jsdom": every test file under
// this suite imports ONLY pure pricing/state-machine functions (the
// pricing engine, the installment-materialization oracle) — none of them
// touch the DOM, and none of them import any "use client"/React component
// or any "use server" Server Action module (those pull in Next.js
// server-runtime machinery like next/headers' cookies(), which has no
// meaning outside a real request and isn't worth stubbing out just to test
// arithmetic). If a future test needs to render a React component, add a
// second config (see packages/validators/vitest.config.ts's own note on
// this) rather than switching this one to jsdom for everyone.
export default defineConfig({
  test: {
    environment: "node",
  },
});
