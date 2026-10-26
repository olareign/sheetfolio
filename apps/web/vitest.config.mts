import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    // Tests that start an in-process Postgres (PGlite) need a few seconds when the whole suite runs at once.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
