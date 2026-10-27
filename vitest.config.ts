/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's Vite config lets tests render `.astro` components with the
// Container API and resolve `astro:assets` like the real build.
export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
