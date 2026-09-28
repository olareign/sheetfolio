import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname },
  },
  test: { environment: "node", include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
});
