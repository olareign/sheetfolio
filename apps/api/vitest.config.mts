import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC instead of esbuild: Nest's dependency injection needs emitted decorator metadata.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: { environment: "node", include: ["src/**/*.test.ts", "test/**/*.test.ts"] },
});
