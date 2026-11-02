import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Builds dist/ so the CLI smoke test spawns a fresh binary.
    globalSetup: ["tests/global-setup.ts"],
  },
});
