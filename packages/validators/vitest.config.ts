import { defineConfig } from "vitest/config";

// Minimal config — this package has zero framework/DOM dependencies (pure
// Zod schemas), so the default node environment is enough. If a future
// package's tests need a browser-like DOM (e.g. testing a React
// component), copy this file and set `test.environment: "jsdom"` there
// instead of changing this one — see TESTING.md at the repo root for the
// full convention.
export default defineConfig({
  test: {
    environment: "node",
  },
});
