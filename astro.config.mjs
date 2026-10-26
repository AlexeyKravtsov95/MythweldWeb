// @ts-check
import { defineConfig } from "astro/config";

// Static output only: the site has no backend, adapters or server routes.
export default defineConfig({
  site: "https://mythweld.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  i18n: {
    locales: ["en", "ru"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
});
